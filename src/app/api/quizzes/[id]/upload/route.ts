import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/pdf/extract-text';
import { extractSourceReference, type SourceMetadata } from '@/lib/ai/extract-source-reference';
import { enrichSourceMetadata } from '@/lib/metadata/enrich';
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
    let pmid: string | null = null;
    let pmcid: string | null = null;
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
        pmid = result.metadata.pmid || null;
        pmcid = result.metadata.pmcid || null;
        sourceMetadata = result.metadata;
        suggestedFilename = result.metadata.suggested_filename || null;
        console.log('[upload] After LLM extraction — DOI:', doi, 'PMID:', pmid, 'PMCID:', pmcid);
      }
    } catch (err) {
      console.error('[upload] Citation extraction failed:', err);
    }

    // Best-effort enrichment: fill in PMID, PMCID, keywords, etc. from
    // PubMed / Crossref. If it fails, sourceMetadata stays as-is.
    if (sourceMetadata) {
      try {
        console.log('[upload] Starting enrichment with DOI:', sourceMetadata.doi);
        sourceMetadata = await enrichSourceMetadata(sourceMetadata);
        // Update identifiers in case enrichment discovered or confirmed them
        if (sourceMetadata.doi && !doi) doi = sourceMetadata.doi;
        if (sourceMetadata.pmid && !pmid) pmid = sourceMetadata.pmid;
        if (sourceMetadata.pmcid && !pmcid) pmcid = sourceMetadata.pmcid;
        console.log('[upload] After enrichment — DOI:', doi, 'PMID:', pmid, 'PMCID:', pmcid);
      } catch (err) {
        console.error('[upload] Enrichment failed:', err);
      }
    } else {
      console.log('[upload] No sourceMetadata — skipping enrichment');
    }

    // Use the AI-suggested filename when available; fall back to the original upload name
    const finalFilename = suggestedFilename && suggestedFilename !== 'document.pdf'
      ? suggestedFilename
      : file.name;

    // Upload PDF to Supabase Storage under the final filename
    const storagePath = `quizzes/${params.id}/${finalFilename}`;
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

    // Core save — must succeed (uses only original columns)
    const { error: updateError } = await supabase
      .from('quizzes')
      .update({
        source_text: extraction.text,
        source_filename: finalFilename,
        pdf_storage_path: storagePath,
        ...(sourceReference ? { source_reference: sourceReference } : {}),
        ...(doi ? { doi } : {}),
        ...(pmid ? { pmid } : {}),
        ...(pmcid ? { pmcid } : {}),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Quiz update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save extracted text.' },
        { status: 500 }
      );
    }

    // Best-effort save of new metadata columns (non-fatal if migration hasn't run yet)
    if (sourceMetadata || suggestedFilename) {
      await supabase
        .from('quizzes')
        .update({
          ...(sourceMetadata ? { source_metadata: sourceMetadata } : {}),
          ...(suggestedFilename ? { suggested_filename: suggestedFilename } : {}),
        })
        .eq('id', params.id)
        .then(({ error }) => {
          if (error) console.error('Metadata columns save (non-fatal):', error);
        });
    }

    return NextResponse.json({
      pdf_storage_path: storagePath,
      source_text_preview: extraction.preview,
      source_reference: sourceReference,
      source_metadata: sourceMetadata,
      suggested_filename: suggestedFilename,
      doi,
      pmid,
      pmcid,
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
