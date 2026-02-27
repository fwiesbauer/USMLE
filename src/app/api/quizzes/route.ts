import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateQuizSchema = z.object({
  title: z.string().min(1).max(200),
  question_count_requested: z.number().int().min(3).max(30).default(10),
});

export async function GET() {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('educator_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }

  return NextResponse.json(quizzes);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateQuizSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({
      educator_id: user.id,
      title: parsed.data.title,
      question_count_requested: parsed.data.question_count_requested,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }

  return NextResponse.json(quiz, { status: 201 });
}
