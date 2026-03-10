'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyPlaceholder, setApiKeyPlaceholder] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: educator } = await supabase
        .from('educators')
        .select('*')
        .eq('id', user.id)
        .single();

      if (educator) {
        setDisplayName(educator.display_name || '');
        setEmail(educator.email);
        if (educator.anthropic_api_key_encrypted) {
          setApiKeyPlaceholder('sk-ant-***************');
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error: updateError } = await supabase
        .from('educators')
        .update({ display_name: displayName })
        .eq('id', user.id);

      if (updateError) {
        setError('Failed to update profile.');
      } else {
        setMessage('Profile updated.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update API key.');
      } else {
        setMessage('API key updated.');
        setApiKey('');
        setApiKeyPlaceholder('sk-ant-***************');
      }
    } finally {
      setSavingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo href="/dashboard" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

        {message && (
          <p className="text-sm text-correct-dark bg-correct-fill rounded-lg px-3 py-2">
            {message}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Profile */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Profile</h3>
          <div className="space-y-4">
            <Input
              id="displayName"
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              id="email"
              label="Email"
              value={email}
              disabled
              className="bg-gray-50"
            />
            <Button onClick={handleSaveProfile} loading={saving}>
              Save Profile
            </Button>
          </div>
        </Card>

        {/* API Key */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Anthropic API Key</h3>
          <p className="text-sm text-gray-500 mb-4">
            Your API key is encrypted and stored securely. It is never exposed in
            client responses.
          </p>
          <div className="space-y-4">
            <Input
              id="apiKey"
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyPlaceholder || 'sk-ant-...'}
            />
            <Button onClick={handleSaveApiKey} loading={savingKey}>
              Update API Key
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
