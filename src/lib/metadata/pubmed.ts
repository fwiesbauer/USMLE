/**
 * PubMed E-utilities lookup helper.
 *
 * Uses the free NCBI E-utilities API to fetch article metadata by PMID.
 * No API key is required for low-volume use (< 3 requests/second).
 *
 * Flow:
 *   1. Given a PMID, call ESummary to get canonical article metadata.
 *   2. Call EFetch (XML) to retrieve MeSH terms and author keywords.
 *
 * If anything fails, returns null — the caller should treat this as
 * "no extra data available" and continue with whatever it already has.
 */

const ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

/** Timeout for each HTTP request (10 seconds). */
const REQUEST_TIMEOUT_MS = 10_000;

/** What we get back from a PubMed lookup. */
export interface PubMedResult {
  pmid: string;
  pmcid: string | null;
  title: string | null;
  authors: { family: string; given: string }[];
  journal_title: string | null;
  journal_abbreviation: string | null;
  issn: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publication_date: string | null;
  doi: string | null;
  /** MeSH headings (e.g. "Myocardial Infarction") */
  mesh_terms: string[];
  /** Author-supplied keywords from the article */
  author_keywords: string[];
}

/**
 * Look up an article by PMID and return enriched metadata.
 * Returns null if the lookup fails or PMID is not found.
 */
export async function lookupByPmid(pmid: string): Promise<PubMedResult | null> {
  if (!pmid || !/^\d{6,10}$/.test(pmid)) return null;

  try {
    // Step 1: ESummary for core bibliographic data
    const summaryUrl = `${ESUMMARY_URL}?db=pubmed&id=${pmid}&retmode=json`;
    const summaryResp = await fetchWithTimeout(summaryUrl);
    if (!summaryResp.ok) return null;

    const summaryJson = await summaryResp.json();
    const article = summaryJson?.result?.[pmid];
    if (!article) return null;

    // Extract basic fields from ESummary
    const result: PubMedResult = {
      pmid,
      pmcid: extractPmcidFromIds(article.articleids) || null,
      title: article.title || null,
      authors: (article.authors || []).slice(0, 3).map((a: { name?: string }) => {
        const parts = (a.name || '').split(' ');
        const family = parts[0] || '';
        const given = parts.slice(1).join(' ') || '';
        return { family, given };
      }),
      journal_title: article.fulljournalname || null,
      journal_abbreviation: article.source || null,
      issn: article.issn || article.essn || null,
      volume: article.volume || null,
      issue: article.issue || null,
      pages: article.pages || null,
      publication_date: article.pubdate || null,
      doi: extractDoiFromIds(article.articleids) || null,
      mesh_terms: [],
      author_keywords: [],
    };

    // Step 2: EFetch XML for MeSH terms and author keywords
    // This is a separate call because ESummary doesn't include them.
    try {
      const keywords = await fetchKeywords(pmid);
      result.mesh_terms = keywords.mesh_terms;
      result.author_keywords = keywords.author_keywords;
    } catch {
      // Non-fatal — we still have the core metadata from ESummary
    }

    return result;
  } catch {
    // Any network/parse error → return null so the pipeline continues
    return null;
  }
}

/**
 * Search PubMed for a PMID using a DOI.
 * Returns the PMID string if found, or null.
 */
export async function findPmidByDoi(doi: string): Promise<string | null> {
  if (!doi) return null;

  try {
    const searchUrl = `${ESEARCH_URL}?db=pubmed&term=${encodeURIComponent(doi)}[doi]&retmode=json`;
    console.log('[pubmed] Searching PubMed by DOI:', searchUrl);
    const resp = await fetchWithTimeout(searchUrl);
    console.log('[pubmed] Search response status:', resp.status);
    if (!resp.ok) return null;

    const json = await resp.json();
    const ids: string[] = json?.esearchresult?.idlist || [];
    console.log('[pubmed] Found PMIDs:', ids);
    return ids.length > 0 ? ids[0] : null;
  } catch (err) {
    console.error('[pubmed] findPmidByDoi error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Fetch with a timeout so we never block the pipeline for too long. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extract DOI from PubMed's articleids array. */
function extractDoiFromIds(ids: { idtype: string; value: string }[] | undefined): string {
  if (!Array.isArray(ids)) return '';
  const doiEntry = ids.find((id) => id.idtype === 'doi');
  return doiEntry?.value || '';
}

/** Extract PMCID from PubMed's articleids array. */
function extractPmcidFromIds(ids: { idtype: string; value: string }[] | undefined): string {
  if (!Array.isArray(ids)) return '';
  const pmcEntry = ids.find((id) => id.idtype === 'pmc');
  return pmcEntry?.value || '';
}

/**
 * Fetch MeSH terms and author keywords from EFetch XML.
 *
 * We parse the XML with simple regex — no XML parser dependency needed
 * because the structure is well-known and predictable.
 */
async function fetchKeywords(pmid: string): Promise<{
  mesh_terms: string[];
  author_keywords: string[];
}> {
  const url = `${EFETCH_URL}?db=pubmed&id=${pmid}&rettype=xml&retmode=xml`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) return { mesh_terms: [], author_keywords: [] };

  const xml = await resp.text();

  // MeSH headings: <DescriptorName ...>Term</DescriptorName>
  const mesh_terms = uniqueMatches(xml, /<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g);

  // Author keywords: <Keyword ...>Term</Keyword>
  const author_keywords = uniqueMatches(xml, /<Keyword[^>]*>([^<]+)<\/Keyword>/g);

  return { mesh_terms, author_keywords };
}

/** Extract all capture-group-1 matches from a regex, deduplicated. */
function uniqueMatches(text: string, regex: RegExp): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1].trim();
    if (!seen.has(value)) {
      seen.add(value);
      results.push(value);
    }
  }
  return results;
}
