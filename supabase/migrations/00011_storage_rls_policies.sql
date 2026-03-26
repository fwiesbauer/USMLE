-- Allow authenticated users to upload and read PDFs in the 'pdfs' storage bucket.
-- Required because the browser client now uploads directly to Supabase Storage
-- (bypassing the Vercel serverless function to avoid the 4.5 MB body size limit).

-- Allow authenticated users to upload PDFs to their quiz folders
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs');

-- Allow authenticated users to read/download PDFs
CREATE POLICY "Authenticated users can read PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');

-- Allow authenticated users to update (upsert) PDFs
CREATE POLICY "Authenticated users can update PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs');
