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

const VoteSchema = z.object({
  visitor_id: z.string().min(1),
  vote: z.union([z.literal(1), z.literal(-1)]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = getServiceClient();

    const { data: votes, error } = await supabase
      .from('question_votes')
      .select('vote')
      .eq('question_id', params.questionId);

    if (error) {
      console.error('Votes GET error:', JSON.stringify(error));
      return NextResponse.json({ question_id: params.questionId, thumbs_up: 0, thumbs_down: 0 });
    }

    const thumbs_up = (votes ?? []).filter((v) => v.vote === 1).length;
    const thumbs_down = (votes ?? []).filter((v) => v.vote === -1).length;

    return NextResponse.json({ question_id: params.questionId, thumbs_up, thumbs_down });
  } catch (err) {
    console.error('Votes GET uncaught:', err);
    return NextResponse.json({ question_id: params.questionId, thumbs_up: 0, thumbs_down: 0 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = getServiceClient();

    const body = await request.json();
    const parsed = VoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if the visitor already has a vote
    const { data: existing, error: selectError } = await supabase
      .from('question_votes')
      .select('id, vote')
      .eq('question_id', params.questionId)
      .eq('visitor_id', parsed.data.visitor_id)
      .maybeSingle();

    if (selectError) {
      console.error('Vote select error:', JSON.stringify(selectError));
      return NextResponse.json({ error: `Select failed: ${selectError.message}` }, { status: 500 });
    }

    if (existing) {
      // Update existing vote
      const { error: updateError } = await supabase
        .from('question_votes')
        .update({ vote: parsed.data.vote })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Vote update error:', JSON.stringify(updateError));
        return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
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
        console.error('Vote insert error:', JSON.stringify(insertError));
        return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Votes POST uncaught error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
