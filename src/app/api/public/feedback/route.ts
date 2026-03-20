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

const FeedbackSchema = z.object({
  page_url: z.string().max(500),
  feedback_type: z.enum(['bug', 'suggestion', 'question', 'other']),
  message: z.string().min(1).max(5000),
  email: z.string().email().max(254).optional(),
  visitor_id: z.string().max(100).optional(),
  quiz_token: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();

    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('site_feedback')
      .insert({
        page_url: parsed.data.page_url,
        feedback_type: parsed.data.feedback_type,
        message: parsed.data.message,
        email: parsed.data.email || null,
        visitor_id: parsed.data.visitor_id || null,
        quiz_token: parsed.data.quiz_token || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback insert error:', JSON.stringify(error));
      return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Feedback POST uncaught error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
