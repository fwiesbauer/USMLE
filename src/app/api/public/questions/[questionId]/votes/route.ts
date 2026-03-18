import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const VoteSchema = z.object({
  visitor_id: z.string().min(1),
  vote: z.union([z.literal(1), z.literal(-1)]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const supabase = createServiceClient();

  const { data: votes } = await supabase
    .from('question_votes')
    .select('vote')
    .eq('question_id', params.questionId);

  const thumbs_up = (votes ?? []).filter((v) => v.vote === 1).length;
  const thumbs_down = (votes ?? []).filter((v) => v.vote === -1).length;

  return NextResponse.json({ question_id: params.questionId, thumbs_up, thumbs_down });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const supabase = createServiceClient();

  const body = await request.json();
  const parsed = VoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Upsert: if visitor already voted, update their vote
  const { error } = await supabase
    .from('question_votes')
    .upsert(
      {
        question_id: params.questionId,
        visitor_id: parsed.data.visitor_id,
        vote: parsed.data.vote,
      },
      { onConflict: 'question_id,visitor_id' }
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
  }

  // Return updated counts
  const { data: votes } = await supabase
    .from('question_votes')
    .select('vote')
    .eq('question_id', params.questionId);

  const thumbs_up = (votes ?? []).filter((v) => v.vote === 1).length;
  const thumbs_down = (votes ?? []).filter((v) => v.vote === -1).length;

  return NextResponse.json({ question_id: params.questionId, thumbs_up, thumbs_down });
}
