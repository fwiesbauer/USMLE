import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(`Missing env: URL=${!!url}, KEY=${!!key}`);
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CommentSchema = z.object({
  commenter_name: z.string().max(100).optional(),
  comment_text: z.string().min(1).max(2000),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = getServiceClient();

    const { data: comments, error } = await supabase
      .from('question_comments')
      .select('id, question_id, commenter_name, comment_text, created_at')
      .eq('question_id', params.questionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Comments GET error:', JSON.stringify(error));
      return NextResponse.json([]);
    }

    return NextResponse.json(comments ?? []);
  } catch (err) {
    console.error('Comments GET uncaught:', err);
    return NextResponse.json([]);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = getServiceClient();

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
      console.error('Comment insert error:', JSON.stringify(error));
      return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Comments POST uncaught error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
