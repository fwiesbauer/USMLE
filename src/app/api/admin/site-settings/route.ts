import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto/encrypt';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

async function requireAdmin() {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const service = createServiceClient();
  const { data: educator } = await service
    .from('educators')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!educator || educator.role !== 'admin') return null;
  return user;
}

// GET: Read current site settings (admin only)
export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('site_settings')
    .select('master_api_key_enabled, master_ai_provider, master_api_key_encrypted, updated_at')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
  }

  return NextResponse.json({
    master_api_key_enabled: data.master_api_key_enabled,
    master_ai_provider: data.master_ai_provider,
    has_master_key: !!data.master_api_key_encrypted,
    updated_at: data.updated_at,
  });
}

const UpdateSchema = z.object({
  master_api_key: z.string().min(1).optional(),
  master_api_key_enabled: z.boolean().optional(),
  master_ai_provider: z.enum(['anthropic', 'openai', 'google']).optional(),
});

// PUT: Update site settings (admin only)
export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Encrypt the master key if provided — plaintext never stored
  if (parsed.data.master_api_key) {
    updates.master_api_key_encrypted = encrypt(parsed.data.master_api_key);
  }
  if (parsed.data.master_api_key_enabled !== undefined) {
    updates.master_api_key_enabled = parsed.data.master_api_key_enabled;
  }
  if (parsed.data.master_ai_provider) {
    updates.master_ai_provider = parsed.data.master_ai_provider;
  }

  const service = createServiceClient();
  const { error } = await service
    .from('site_settings')
    .update(updates)
    .eq('id', 1);

  if (error) {
    console.error('Site settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
