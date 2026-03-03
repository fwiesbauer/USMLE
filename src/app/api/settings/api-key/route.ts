import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto/encrypt';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ApiKeySchema = z.object({
  api_key: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input' },
      { status: 400 }
    );
  }

  try {
    const encrypted = encrypt(parsed.data.api_key);

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('educators')
      .update({ anthropic_api_key_encrypted: encrypted })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Encryption error:', message);
    return NextResponse.json(
      { error: `Encryption failed: ${message}` },
      { status: 500 }
    );
  }
}
