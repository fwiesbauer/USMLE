import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/ai/generate-questions';
import { extractSourceReference } from '@/lib/ai/extract-source-reference';
import { decrypt } from '@/lib/crypto/encrypt';
import { NextRequest, NextResponse } from 'next/server';
import type { AIProvider } from '@/lib/ai/providers';

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

  // Get educator's API key and provider
  const serviceClient = createServiceClient();
  const { data: educator } = await serviceClient
    .from('educators')
    .select('anthropic_api_key_encrypted, ai_provider')
    .eq('id', user.id)
    .single();

  if (!educator?.anthropic_api_key_encrypted) {
    return NextResponse.json(
      { error: 'No API key configured. Please add your API key in Settings.' },
      { status: 400 }
    );
  }

  const provider = (educator.ai_provider || 'anthropic') as AIProvider;

  let apiKey: string;
  try {
    apiKey = decrypt(educator.anthropic_api_key_encrypted);
  } catch {
    return NextResponse.json(
      { error: 'Failed to decrypt API key. Please update your API key in Settings.' },
      { status: 500 }
    );
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
    const doi = refResult?.doi || null;
    const sourceMetadata = refResult?.metadata || null;
    const suggestedFilename = refResult?.metadata?.suggested_filename || null;

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
  const jsonMatch = err.message.match(/\{[\s\S]*"message"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) return jsonMatch[1];

  // If the message is very long (raw JSON dump), use a generic fallback
  if (err.message.length > 200) return 'Generation failed. Please try again.';

  return err.message;
}
