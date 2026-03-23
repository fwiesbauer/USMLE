import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/pdf/extract-text';
import { extractSourceReference, type SourceMetadata } from '@/lib/ai/extract-source-reference';
import { decrypt } from '@/lib/crypto/encrypt';
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

    // Try to extract structured bibliographic metadata using Haiku (non-blocking)
    let sourceReference: string | null = null;
    let doi: string | null = null;
    let sourceMetadata: SourceMetadata | null = null;
    let suggestedFilename: string | null = null;
    try {
      const serviceClient = createServiceClient();
      const { data: educator } = await serviceClient
        .from('educators')
        .select('anthropic_api_key_encrypted, ai_provider')
        .eq('id', user.id)
        .single();

      if (educator?.anthropic_api_key_encrypted) {
        const apiKey = decrypt(educator.anthropic_api_key_encrypted);
        const provider = (educator.ai_provider || 'anthropic') as import('@/lib/ai/providers').AIProvider;
        const result = await extractSourceReference(extraction.text, apiKey, provider);
        sourceReference = result.reference;
        doi = result.doi || null;
        sourceMetadata = result.metadata;
        suggestedFilename = result.metadata.suggested_filename || null;
      }
    } catch {
      // Non-fatal — citation extraction is best-effort
    }

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
    const { error: updateError } = await supabase
      .from('quizzes')
      .update({
        source_text: extraction.text,
        source_filename: file.name,
        pdf_storage_path: storagePath,
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Quiz update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save extracted text.' },
        { status: 500 }
      );
    }

    // Save source reference, DOI, and structured metadata — non-fatal if columns don't exist yet
    if (sourceReference || doi || sourceMetadata) {
      const updateFields: Record<string, unknown> = {};
      if (sourceReference) updateFields.source_reference = sourceReference;
      if (doi) updateFields.doi = doi;
      if (sourceMetadata) updateFields.source_metadata = sourceMetadata;
      if (suggestedFilename) updateFields.suggested_filename = suggestedFilename;

      await supabase
        .from('quizzes')
        .update(updateFields)
        .eq('id', params.id)
        .then(({ error }) => {
          if (error) console.error('Metadata save error (non-fatal):', error);
        });
    }

    return NextResponse.json({
      pdf_storage_path: storagePath,
      source_text_preview: extraction.preview,
      source_reference: sourceReference,
      source_metadata: sourceMetadata,
      suggested_filename: suggestedFilename,
      doi,
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
