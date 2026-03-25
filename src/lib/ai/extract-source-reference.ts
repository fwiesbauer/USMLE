import { createCompletion, getFastModel, type AIProvider } from './providers';

/**
 * Structured bibliographic metadata extracted from a PDF.
 * Fields that could not be reliably determined are null.
 */
export interface SourceMetadata {
  article_title: string | null;
  /** Up to three authors; each has family and given name */
  authors: { family: string; given: string }[];
  journal_title: string | null;
  journal_abbreviation: string | null;
  year: number | null;
  publication_date: string | null; // e.g. "2024-03-15" or "2024 Mar"
  volume: string | null;
  issue: string | null;
  pages: string | null; // e.g. "123-130"
  doi: string | null;
  pmid: string | null;
  pmcid: string | null;
  issn: string | null;
  keywords: string[];
  /** Whether this looks like a published journal article or an unpublished manuscript */
  document_type: 'journal_article' | 'manuscript';
  /** Suggested stable filename, e.g. "Smith 2024 - Cardiac Outcomes.pdf" */
  suggested_filename: string;
}

/**
 * Extracts structured bibliographic metadata and a formatted NEJM-style
 * reference from the source text of an uploaded PDF.
 *
 * Uses a fast, cheap model call to keep costs low.
 * Returns the formatted reference string (for backward compat), the DOI,
 * and the full structured metadata.
 */
export async function extractSourceReference(
  sourceText: string,
  apiKey: string,
  provider: AIProvider = 'anthropic'
): Promise<{ reference: string; doi: string; metadata: SourceMetadata }> {
  // Send the first ~6000 chars — bibliographic info is near the top,
  // but keywords and author affiliations can extend further
  const excerpt = sourceText.slice(0, 6000);

  // First, try to extract DOI, PMID, and PMCID via regex (more reliable than LLM for these)
  const regexDoi = extractDoiFromText(sourceText);
  const regexPmid = extractPmidFromText(sourceText);
  const regexPmcid = extractPmcidFromText(sourceText);

  const prompt = `You are a bibliographic extraction agent for uploaded medical/scientific PDFs.
Read the following document excerpt and extract as much reliable bibliographic information as you can. Do NOT invent or guess any information — if a field is not present or unclear, use null.

IMPORTANT for PMID and PMCID: Only extract these if you see an explicit "PMID" or "PMCID" label, or a PubMed/PMC URL (e.g. pubmed.ncbi.nlm.nih.gov/12345 or ncbi.nlm.nih.gov/pmc/articles/PMC12345). Do NOT guess these values from other numeric identifiers.

Extract these fields:
- article_title: The full title of the article/paper
- authors: Array of up to the first 3 authors, each as {"family": "...", "given": "..."}. Use the exact names as printed.
- journal_title: Full journal name (e.g., "New England Journal of Medicine")
- journal_abbreviation: Abbreviated journal name if visible (e.g., "N Engl J Med")
- year: Publication year as a number (e.g., 2024)
- publication_date: Full publication date if available (e.g., "2024-03-15" or "2024 Mar 15")
- volume: Volume number as a string
- issue: Issue number as a string
- pages: Page range as a string (e.g., "123-130")
- doi: Digital Object Identifier if present
- pmid: PubMed ID if visible anywhere in the document
- pmcid: PubMed Central ID if visible (e.g., "PMC12345678")
- issn: ISSN of the journal if visible
- keywords: Array of keywords describing the main medical topics. Use the article's own keywords section if present; otherwise pick 3-5 key medical terms from the content.
- document_type: "journal_article" if this looks like a published journal article (has journal name, volume/issue, page range, or publisher branding), or "manuscript" if it looks like an unpublished draft, internal document, or cannot be determined.
- suggested_filename: A stable, human-readable filename using the pattern "FirstAuthorFamily Year - ShortTitle.pdf" where ShortTitle is the first few important words of the title, cleaned of punctuation. If you cannot reliably identify an author or year, use a short version of the title and any visible internal ID.

Also produce a formatted NEJM-style reference line (without a leading number):
- If a scientific paper/guideline: "Author(s). Title. Journal Abbreviation. Year;Volume(Issue):Pages. doi:XX"
  - Authors: Full list if ≤6 (Surname Initials); first 3 + "et al" if >6. No periods between initials.
  - Journal: Use PubMed/NLM abbreviation conventions.
  - Include DOI if present.
- If NOT a scientific paper: "Author(s). Title. Publisher/Source; Year." or just "Title."

Return ONLY a JSON object with this exact structure (no markdown fences, no explanation):
{
  "reference": "...",
  "metadata": {
    "article_title": "..." or null,
    "authors": [{"family": "...", "given": "..."}] or [],
    "journal_title": "..." or null,
    "journal_abbreviation": "..." or null,
    "year": 2024 or null,
    "publication_date": "..." or null,
    "volume": "..." or null,
    "issue": "..." or null,
    "pages": "..." or null,
    "doi": "..." or null,
    "pmid": "..." or null,
    "pmcid": "..." or null,
    "issn": "..." or null,
    "keywords": ["...", "..."],
    "document_type": "journal_article" or "manuscript",
    "suggested_filename": "..."
  }
}

DOCUMENT EXCERPT:
${excerpt}`;

  const responseText = await createCompletion({
    apiKey,
    provider,
    model: getFastModel(provider),
    maxTokens: 1200,
    prompt,
  });

  // Parse the JSON response
  let parsed: { reference?: string; metadata?: Partial<SourceMetadata> };
  try {
    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: treat the whole response as a reference string (backward compat)
    let ref = responseText.trim();
    // Strip leading numbering (e.g. "1. ") if present
    ref = ref.replace(/^\d+\.\s*/, '');
    const fallbackDoi = regexDoi || extractDoiFromText(ref);
    return {
      reference: ref,
      doi: fallbackDoi,
      metadata: buildFallbackMetadata(fallbackDoi),
    };
  }

  // Build the formatted reference
  let reference = parsed.reference?.trim() || '';
  // Strip leading numbering (e.g. "1. ") if present
  reference = reference.replace(/^\d+\.\s*/, '');

  // Build structured metadata with defaults
  const raw = parsed.metadata || {};
  const metadata: SourceMetadata = {
    article_title: raw.article_title || null,
    authors: Array.isArray(raw.authors) ? raw.authors.slice(0, 3) : [],
    journal_title: raw.journal_title || null,
    journal_abbreviation: raw.journal_abbreviation || null,
    year: typeof raw.year === 'number' ? raw.year : null,
    publication_date: raw.publication_date || null,
    volume: raw.volume || null,
    issue: raw.issue || null,
    pages: raw.pages || null,
    doi: raw.doi ? cleanDoi(raw.doi) : regexDoi || null,
    pmid: regexPmid || raw.pmid || null,
    pmcid: regexPmcid || raw.pmcid || null,
    issn: raw.issn || null,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    document_type: raw.document_type === 'manuscript' ? 'manuscript' : 'journal_article',
    suggested_filename: raw.suggested_filename || 'document.pdf',
  };

  // Prefer regex-extracted DOI (more reliable) but fall back to LLM-extracted
  const finalDoi = regexDoi || metadata.doi || extractDoiFromText(reference) || '';

  // Ensure the metadata DOI matches the best one we found
  if (finalDoi) metadata.doi = finalDoi;

  return { reference, doi: finalDoi, metadata };
}

function buildFallbackMetadata(doi: string): SourceMetadata {
  return {
    article_title: null,
    authors: [],
    journal_title: null,
    journal_abbreviation: null,
    year: null,
    publication_date: null,
    volume: null,
    issue: null,
    pages: null,
    doi: doi || null,
    pmid: null,
    pmcid: null,
    issn: null,
    keywords: [],
    document_type: 'manuscript',
    suggested_filename: 'document.pdf',
  };
}

/**
 * Extracts a DOI from text using regex.
 * DOIs typically look like: 10.XXXX/...
 * They appear in URLs like https://doi.org/10.1016/... or as plain text.
 */
export function extractDoiFromText(text: string): string {
  const patterns = [
    /https?:\/\/doi\.org\/(10\.\d{4,}\/[^\s,;)}\]"']+)/i,
    /doi\.org\/(10\.\d{4,}\/[^\s,;)}\]"']+)/i,
    /doi[:\s]+\s*(10\.\d{4,}\/[^\s,;)}\]"']+)/i,
    /\b(10\.\d{4,}\/[^\s,;)}\]"']+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanDoi(match[1]);
    }
  }

  return '';
}

/**
 * Sanitise a raw DOI string.
 * PDF text often concatenates a DOI with the next URL on the same line
 * (e.g. "10.3390/jpm14070741https://www.mdpi.com/journal/jpm").
 * This strips trailing URLs and punctuation so only the DOI remains.
 */
function cleanDoi(raw: string): string {
  // Cut off anything starting with "http" that got concatenated
  let cleaned = raw.replace(/https?:\/\/.*$/, '');
  // Remove trailing punctuation that is not part of a DOI
  cleaned = cleaned.replace(/[.)]+$/, '');
  return cleaned;
}

/**
 * Extracts a PubMed ID (PMID) from text using regex.
 * Looks for explicit "PMID" labels or PubMed URLs — never guesses from bare numbers.
 */
export function extractPmidFromText(text: string): string {
  const patterns = [
    // PubMed URLs: pubmed.ncbi.nlm.nih.gov/12345678
    /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{6,10})/i,
    // Older URL format: ncbi.nlm.nih.gov/pubmed/12345678
    /ncbi\.nlm\.nih\.gov\/pubmed\/(\d{6,10})/i,
    // Explicit label: PMID: 12345678 or PMID 12345678
    /\bPMID[:\s]+(\d{6,10})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
}

/**
 * Extracts a PubMed Central ID (PMCID) from text using regex.
 * Looks for explicit "PMC" labels or PMC URLs — never guesses from bare numbers.
 */
export function extractPmcidFromText(text: string): string {
  const patterns = [
    // PMC URLs: ncbi.nlm.nih.gov/pmc/articles/PMC12345678
    /ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d{6,10})/i,
    // Explicit label: PMCID: PMC12345678 or PMCID PMC12345678
    /\bPMCID[:\s]+(PMC\d{6,10})\b/i,
    // Bare PMC reference in text: PMC12345678
    /\b(PMC\d{6,10})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      // Normalize to uppercase PMC prefix
      return match[1].toUpperCase();
    }
  }

  return '';
}
