'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

type AIProvider = 'anthropic' | 'openai' | 'google';

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'google', label: 'Google (Gemini)' },
];

export function MasterKeySettings() {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('anthropic');
  const [hasKey, setHasKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.master_api_key_enabled !== undefined) {
          setEnabled(data.master_api_key_enabled);
          setProvider(data.master_ai_provider || 'anthropic');
          setHasKey(data.has_master_key);
        }
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    const body: Record<string, unknown> = {
      master_api_key_enabled: enabled,
      master_ai_provider: provider,
    };
    if (newKey.trim()) {
      body.master_api_key = newKey.trim();
    }

    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to save settings.');
      } else {
        setMessage('Master key settings updated.');
        if (newKey.trim()) {
          setHasKey(true);
          setNewKey('');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading settings...</p>;

  return (
    <Card>
      <h3 className="font-bold text-gray-900 mb-1">Master API Key</h3>
      <p className="text-sm text-gray-500 mb-4">
        When enabled, all users on the site use this shared API key instead of
        their own. The key is encrypted at rest and never exposed to clients.
      </p>

      {message && (
        <p className="text-sm text-correct-dark bg-correct-fill rounded-lg px-3 py-2 mb-3">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {/* Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-mid focus:ring-brand-mid"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable master key for all users
          </span>
        </label>

        {/* Provider */}
        <div>
          <label htmlFor="masterProvider" className="block text-sm font-medium text-gray-700 mb-1">
            AI Provider
          </label>
          <select
            id="masterProvider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Key input */}
        <Input
          id="masterApiKey"
          label="API Key"
          type="password"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={hasKey ? '••••••••••••••• (key set — enter new value to replace)' : 'Enter API key'}
        />

        <Button onClick={handleSave} loading={saving}>
          Save Master Key Settings
        </Button>
      </div>
    </Card>
  );
}
