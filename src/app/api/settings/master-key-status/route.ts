import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Public endpoint (no auth required) — only returns whether master key is active.
// Does NOT expose the key itself or any sensitive data.
export async function GET() {
  const service = createServiceClient();
  const { data } = await service
    .from('site_settings')
    .select('master_api_key_enabled, master_api_key_encrypted')
    .eq('id', 1)
    .single();

  const active = !!(data?.master_api_key_enabled && data?.master_api_key_encrypted);

  return NextResponse.json({ master_key_active: active });
}
