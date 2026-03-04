import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
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

  // Verify quiz ownership and check question count
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', params.id)
    .eq('educator_id', user.id)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', params.id);

  if (!count || count < 3) {
    return NextResponse.json(
      { error: 'At least 3 questions are required to publish.' },
      { status: 400 }
    );
  }

  // Generate share token
  const shareToken = crypto.randomUUID();

  const { error: updateError } = await supabase
    .from('quizzes')
    .update({
      status: 'published',
      share_token: shareToken,
      published_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to publish quiz.' },
      { status: 500 }
    );
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const shareUrl = `${appUrl}/q/${shareToken}`;

  return NextResponse.json({ share_token: shareToken, share_url: shareUrl });
}
