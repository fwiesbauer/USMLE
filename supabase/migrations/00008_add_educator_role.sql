-- Add role column to educators table
ALTER TABLE educators
  ADD COLUMN role TEXT NOT NULL DEFAULT 'educator'
  CHECK (role IN ('educator', 'admin'));

-- Set franz.wiesbauer@gmail.com as admin
UPDATE educators SET role = 'admin' WHERE email = 'franz.wiesbauer@gmail.com';
