import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateQuestionSchema = z.object({
  topic: z.string().optional(),
  section: z.string().optional(),
  cor_loe: z.string().optional(),
  vignette: z.string().optional(),
  question_text: z.string().optional(),
  options: z
    .array(z.object({ letter: z.string(), text: z.string() }))
    .length(5)
    .optional(),
  correct_answer: z.string().optional(),
  explanation: z.string().optional(),
  nuggets: z.array(z.string()).optional(),
  organ_systems: z.array(z.string()).optional(),
  physician_tasks: z.array(z.string()).optional(),
  disciplines: z.array(z.string()).optional(),
});

export async function PUT(
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

  // Verify question belongs to educator's quiz
  const { data: question } = await supabase
    .from('questions')
    .select('*, quizzes!inner(educator_id)')
    .eq('id', params.id)
    .single();

  if (
    !question ||
    (question as Record<string, unknown>).quizzes === null
  ) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  const quizData = (question as Record<string, unknown>).quizzes as Record<string, unknown>;
  if (quizData.educator_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = UpdateQuestionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from('questions')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
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

  // Verify question belongs to educator's quiz
  const { data: question } = await supabase
    .from('questions')
    .select('*, quizzes!inner(educator_id)')
    .eq('id', params.id)
    .single();

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  const quizData = (question as Record<string, unknown>).quizzes as Record<string, unknown>;
  if (quizData.educator_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
