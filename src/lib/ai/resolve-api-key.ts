import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto/encrypt';
import type { AIProvider } from '@/lib/ai/providers';

export interface ResolvedKey {
  apiKey: string;
  provider: AIProvider;
  source: 'master' | 'educator';
}

/**
 * Resolve which API key to use for AI calls.
 *
 * Priority:
 *  1. Master key (if enabled by admin in site_settings)
 *  2. Educator's own key
 *
 * All keys are stored encrypted (AES-256-GCM) and only decrypted
 * here, server-side, at the moment of use. Plaintext keys are never
 * persisted or sent to the client.
 */
export async function resolveApiKey(
  educatorId: string
): Promise<ResolvedKey> {
  const service = createServiceClient();

  // 1. Check if a master key is enabled
  const { data: settings } = await service
    .from('site_settings')
    .select('master_api_key_encrypted, master_api_key_enabled, master_ai_provider')
    .eq('id', 1)
    .single();

  if (settings?.master_api_key_enabled && settings.master_api_key_encrypted) {
    const apiKey = decrypt(settings.master_api_key_encrypted);
    return {
      apiKey,
      provider: (settings.master_ai_provider || 'anthropic') as AIProvider,
      source: 'master',
    };
  }

  // 2. Fall back to educator's own key
  const { data: educator } = await service
    .from('educators')
    .select('anthropic_api_key_encrypted, ai_provider')
    .eq('id', educatorId)
    .single();

  if (!educator?.anthropic_api_key_encrypted) {
    throw new Error('No API key configured. Please add your API key in Settings.');
  }

  const apiKey = decrypt(educator.anthropic_api_key_encrypted);
  return {
    apiKey,
    provider: (educator.ai_provider || 'anthropic') as AIProvider,
    source: 'educator',
  };
}
