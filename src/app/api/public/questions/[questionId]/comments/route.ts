import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CommentSchema = z.object({
  commenter_name: z.string().max(100).optional(),
  comment_text: z.string().min(1).max(2000),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const supabase = createServiceClient();

  const { data: comments, error } = await supabase
    .from('question_comments')
    .select('id, question_id, commenter_name, comment_text, created_at')
    .eq('question_id', params.questionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(comments ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const supabase = createServiceClient();

  const body = await request.json();
  const parsed = CommentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('question_comments')
    .insert({
      question_id: params.questionId,
      commenter_name: parsed.data.commenter_name || null,
      comment_text: parsed.data.comment_text,
    })
    .select()
    .single();

  if (error) {
    console.error('Comment insert error:', error);
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
