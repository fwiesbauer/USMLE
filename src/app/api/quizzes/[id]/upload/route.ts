import { createServerClient } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/pdf/extract-text';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify quiz ownership
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', params.id)
    .eq('educator_id', user.id)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 20 MB.' },
      { status: 400 }
    );
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Only PDF files are accepted.' },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text
    const extraction = await extractTextFromPDF(buffer);

    // Upload PDF to Supabase Storage
    const storagePath = `quizzes/${params.id}/${file.name}`;
    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      // Non-fatal — continue without storage
    }

    // Update quiz with extracted text
    await supabase
      .from('quizzes')
      .update({
        source_text: extraction.text,
        source_filename: file.name,
        pdf_storage_path: storagePath,
      })
      .eq('id', params.id);

    return NextResponse.json({
      pdf_storage_path: storagePath,
      source_text_preview: extraction.preview,
      word_count: extraction.wordCount,
      page_count: extraction.pageCount,
      warning: extraction.warning,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to process PDF';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
