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

  const { data: votes, error } = await supabase
    .from('question_votes')
    .select('vote')
    .eq('question_id', params.questionId);

  if (error) {
    console.error('Votes GET error:', error);
    return NextResponse.json({ question_id: params.questionId, thumbs_up: 0, thumbs_down: 0 });
  }

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

  // Check if the visitor already has a vote
  const { data: existing } = await supabase
    .from('question_votes')
    .select('id, vote')
    .eq('question_id', params.questionId)
    .eq('visitor_id', parsed.data.visitor_id)
    .maybeSingle();

  if (existing) {
    // Update existing vote
    const { error: updateError } = await supabase
      .from('question_votes')
      .update({ vote: parsed.data.vote })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Vote update error:', updateError);
      return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
    }
  } else {
    // Insert new vote
    const { error: insertError } = await supabase
      .from('question_votes')
      .insert({
        question_id: params.questionId,
        visitor_id: parsed.data.visitor_id,
        vote: parsed.data.vote,
      });

    if (insertError) {
      console.error('Vote insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
    }
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
