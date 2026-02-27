import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
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

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('status')
    .eq('id', params.id)
    .eq('educator_id', user.id)
    .single();

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  let progressMessage = '';
  switch (quiz.status) {
    case 'generating':
      progressMessage = 'AI is generating questions...';
      break;
    case 'review':
      progressMessage = 'Questions are ready for review.';
      break;
    case 'error':
      progressMessage = 'Generation failed. Please try again.';
      break;
    default:
      progressMessage = '';
  }

  return NextResponse.json({
    status: quiz.status,
    progress_message: progressMessage,
  });
}
