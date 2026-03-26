import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/pdf/extract-text';
import { extractSourceReference, type SourceMetadata } from '@/lib/ai/extract-source-reference';
import { enrichSourceMetadata } from '@/lib/metadata/enrich';
import { findIdsByDoi } from '@/lib/metadata/pubmed';
import { decrypt } from '@/lib/crypto/encrypt';
import { NextRequest, NextResponse } from 'next/server';

// Allow up to 60s for PDF processing + enrichment (Vercel Hobby max)
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Client uploads the PDF directly to Supabase Storage and sends us the path + filename
    const body = await request.json();
    const storagePath: string | undefined = body.storage_path;
    const originalFilename: string | undefined = body.filename;

    if (!storagePath) {
      return NextResponse.json({ error: 'No storage path provided.' }, { status: 400 });
    }

    // Download PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to read uploaded PDF from storage.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

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

    // Safety-net: if enrichment didn't find PMID/PMCID but we have a DOI,
    // try one more direct ID Converter call (independent of enrichment function)
    if (doi && (!pmid || !pmcid)) {
      try {
        console.log('[upload] Safety-net: direct ID Converter call for DOI:', doi);
        const ids = await findIdsByDoi(doi);
        if (ids.pmid && !pmid) { pmid = ids.pmid; console.log('[upload] Safety-net found PMID:', pmid); }
        if (ids.pmcid && !pmcid) { pmcid = ids.pmcid; console.log('[upload] Safety-net found PMCID:', pmcid); }
      } catch (err) {
        console.error('[upload] Safety-net ID Converter failed:', err);
      }
    }

    console.log('[upload] FINAL identifiers for DB save — DOI:', doi, 'PMID:', pmid, 'PMCID:', pmcid);

    // Use the AI-suggested filename when available; fall back to the original upload name
    const rawFilename = suggestedFilename && suggestedFilename !== 'document.pdf'
      ? suggestedFilename
      : (originalFilename || 'document.pdf');
    // Sanitize filename: replace colons and other characters problematic in storage paths/URLs
    const finalFilename = rawFilename.replace(/[:<>"|?*]/g, '-');

    // If the AI suggested a better filename, rename the file in storage
    if (finalFilename !== originalFilename) {
      try {
        const newPath = `quizzes/${params.id}/${finalFilename}`;
        await supabase.storage.from('pdfs').move(storagePath, newPath);
      } catch {
        // Non-fatal — keep the original storage path
      }
    }

    const finalStoragePath = `quizzes/${params.id}/${finalFilename}`;

    // Core save — must succeed
    const updatePayload = {
      source_text: extraction.text,
      source_filename: finalFilename,
      pdf_storage_path: finalStoragePath,
      ...(sourceReference ? { source_reference: sourceReference } : {}),
      ...(doi ? { doi } : {}),
      ...(pmid ? { pmid } : {}),
      ...(pmcid ? { pmcid } : {}),
    };
    console.log('[upload] DB update payload keys:', Object.keys(updatePayload).filter(k => k !== 'source_text'));
    const { error: updateError } = await supabase
      .from('quizzes')
      .update(updatePayload)
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
      pdf_storage_path: finalStoragePath,
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
    console.error('[upload] Unhandled error:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to process PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
