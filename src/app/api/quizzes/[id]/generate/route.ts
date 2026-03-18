import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/ai/generate-questions';
import { extractSourceReference } from '@/lib/ai/extract-source-reference';
import { decrypt } from '@/lib/crypto/encrypt';
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

  // Get educator's API key
  const serviceClient = createServiceClient();
  const { data: educator } = await serviceClient
    .from('educators')
    .select('anthropic_api_key_encrypted')
    .eq('id', user.id)
    .single();

  if (!educator?.anthropic_api_key_encrypted) {
    return NextResponse.json(
      { error: 'No API key configured. Please add your Anthropic API key in Settings.' },
      { status: 400 }
    );
  }

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
        apiKey
      ),
      needsReference
        ? extractSourceReference(quiz.source_text!, apiKey).catch(() => null)
        : Promise.resolve(null),
    ]);
    const sourceReference = refResult?.reference || null;
    const doi = refResult?.doi || null;

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

    await serviceClient
      .from('quizzes')
      .update({
        status: 'review',
        ...(sourceReference ? { source_reference: sourceReference } : {}),
        ...(doi ? { doi } : {}),
      })
      .eq('id', params.id);

    return NextResponse.json({ status: 'review' }, { status: 200 });
  } catch (err) {
    console.error('Generation error:', err);
    await serviceClient
      .from('quizzes')
      .update({ status: 'error' })
      .eq('id', params.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
