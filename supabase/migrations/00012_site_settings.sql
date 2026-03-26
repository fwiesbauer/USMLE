-- Site-wide settings table for admin-managed configuration.
-- Uses a single-row pattern (enforced by CHECK constraint on id).
-- The master API key allows admins to provide a shared API key for all users.

CREATE TABLE site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  master_api_key_encrypted TEXT,
  master_api_key_enabled BOOLEAN NOT NULL DEFAULT false,
  master_ai_provider TEXT NOT NULL DEFAULT 'anthropic',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the default row
INSERT INTO site_settings (id) VALUES (1);

-- RLS: only admins can read/write site settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read site settings"
ON site_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM educators WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update site settings"
ON site_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM educators WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Service role can always read (needed by API routes)
-- (Service role bypasses RLS by default, so no policy needed)
