import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/ai/generate-questions';
import { extractSourceReference } from '@/lib/ai/extract-source-reference';
import { enrichSourceMetadata } from '@/lib/metadata/enrich';
import { resolveApiKey } from '@/lib/ai/resolve-api-key';
import { NextRequest, NextResponse } from 'next/server';

// Allow up to 300s for AI generation (Vercel Pro: 300s, Hobby: 60s)
export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', params.id)
    .eq('educator_id', user.id)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  if (!quiz.source_text) {
    return NextResponse.json(
      { error: 'No source text. Please upload a PDF first.' },
      { status: 400 }
    );
  }

  // Resolve API key: master key (if enabled) → educator's own key
  const serviceClient = createServiceClient();
  let apiKey: string;
  let provider: import('@/lib/ai/providers').AIProvider;
  try {
    const resolved = await resolveApiKey(user.id);
    apiKey = resolved.apiKey;
    provider = resolved.provider;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No API key configured.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Mark as generating
  await supabase
    .from('quizzes')
    .update({ status: 'generating' })
    .eq('id', params.id);

  // Run generation synchronously — fire-and-forget does NOT work on Vercel
  // because serverless functions are torn down after the response is sent.
  try {
    // Run question generation (and source reference extraction if not yet done)
    const needsReference = !quiz.source_reference;
    const [questions, refResult] = await Promise.all([
      generateQuestions(
        quiz.source_text!,
        quiz.question_count_requested,
        apiKey,
        provider
      ),
      needsReference
        ? extractSourceReference(quiz.source_text!, apiKey, provider).catch(() => null)
        : Promise.resolve(null),
    ]);
    const sourceReference = refResult?.reference || null;
    let doi = refResult?.doi || null;
    let pmid = refResult?.metadata?.pmid || null;
    let pmcid = refResult?.metadata?.pmcid || null;
    let sourceMetadata = refResult?.metadata || null;
    const suggestedFilename = refResult?.metadata?.suggested_filename || null;

    // If we didn't re-extract (reference already existed), use the quiz's
    // existing metadata and identifiers as the starting point for enrichment.
    if (!sourceMetadata && quiz.source_metadata) {
      sourceMetadata = quiz.source_metadata as import('@/lib/ai/extract-source-reference').SourceMetadata;
    }
    if (!doi) doi = quiz.doi || null;
    if (!pmid) pmid = quiz.pmid || null;
    if (!pmcid) pmcid = quiz.pmcid || null;

    // Best-effort enrichment: fill in PMID, PMCID, keywords, etc. from
    // PubMed / Crossref. Run if we still lack identifiers OR if metadata
    // was freshly extracted.
    if (sourceMetadata && (!pmid || !pmcid)) {
      try {
        sourceMetadata = await enrichSourceMetadata(sourceMetadata);
        if (sourceMetadata.doi && !doi) doi = sourceMetadata.doi;
        if (sourceMetadata.pmid && !pmid) pmid = sourceMetadata.pmid;
        if (sourceMetadata.pmcid && !pmcid) pmcid = sourceMetadata.pmcid;
      } catch {
        // Non-fatal — enrichment is best-effort
      }
    }

    // Bulk insert questions
    const questionRows = questions.map((q) => ({
      quiz_id: params.id,
      position: q.position,
      topic: q.topic,
      section: q.section,
      cor_loe: q.cor_loe,
      vignette: q.vignette,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      nuggets: q.nuggets,
      organ_systems: q.organ_systems,
      physician_tasks: q.physician_tasks,
      disciplines: q.disciplines,
    }));

    const { error: insertError } = await serviceClient
      .from('questions')
      .insert(questionRows);

    if (insertError) {
      console.error('Question insert error:', insertError);
      await serviceClient
        .from('quizzes')
        .update({ status: 'error' })
        .eq('id', params.id);
      return NextResponse.json(
        { error: 'Failed to save generated questions.' },
        { status: 500 }
      );
    }

    // Core status update (uses only original columns)
    await serviceClient
      .from('quizzes')
      .update({
        status: 'review',
        ...(sourceReference ? { source_reference: sourceReference } : {}),
        ...(doi ? { doi } : {}),
        ...(pmid ? { pmid } : {}),
        ...(pmcid ? { pmcid } : {}),
      })
      .eq('id', params.id);

    // Best-effort save of new metadata columns (non-fatal if migration hasn't run yet)
    if (sourceMetadata || suggestedFilename) {
      await serviceClient
        .from('quizzes')
        .update({
          ...(sourceMetadata ? { source_metadata: sourceMetadata } : {}),
          ...(suggestedFilename ? { suggested_filename: suggestedFilename } : {}),
        })
        .eq('id', params.id)
        .then(({ error }) => {
          if (error) console.error('Metadata columns save (non-fatal):', error);
        });
    }

    return NextResponse.json({ status: 'review' }, { status: 200 });
  } catch (err) {
    console.error('Generation error:', err);
    await serviceClient
      .from('quizzes')
      .update({ status: 'error' })
      .eq('id', params.id);
    return NextResponse.json(
      { error: extractFriendlyError(err) },
      { status: 500 }
    );
  }
}

/** Extract a user-friendly error message from API SDK errors.
 *  SDK errors often have messages like: '400 {"type":"error","error":{"type":"...","message":"..."}}'
 */
function extractFriendlyError(err: unknown): string {
  if (!(err instanceof Error)) return 'Generation failed. Please try again.';

  // Try to extract the nested "message" from JSON embedded in the error string
  const jsonMatch = err.message.match(/\{[\s\S]*"message"\s*:\s*"([^"]+)"/)
  if (jsonMatch?.[1]) return jsonMatch[1];

  // If the message is very long (raw JSON dump), use a generic fallback
  if (err.message.length > 200) return 'Generation failed. Please try again.';

  return err.message;
}
