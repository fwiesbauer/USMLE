import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const FeedbackSchema = z.object({
  page_url: z.string().max(500),
  feedback_type: z.enum(['bug', 'suggestion', 'question', 'other']),
  message: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        educator_id: user.id,
        page_url: parsed.data.page_url,
        feedback_type: parsed.data.feedback_type,
        message: parsed.data.message,
        email: user.email || null,
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
