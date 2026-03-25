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
const IDCONV_URL = 'https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/';

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
  if (!pmid || !/^\d{1,10}$/.test(pmid)) return null;

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
 * Uses the NCBI ID Converter API first (most reliable), then falls back to ESearch.
 * Returns the PMID string if found, or null.
 */
export async function findPmidByDoi(doi: string): Promise<string | null> {
  if (!doi) return null;

  // Strategy 1: NCBI ID Converter API — most reliable for DOI→PMID mapping
  try {
    const convUrl = `${IDCONV_URL}?ids=${encodeURIComponent(doi)}&format=json`;
    console.log('[pubmed] ID Converter lookup:', convUrl);
    const convResp = await fetchWithTimeout(convUrl);
    console.log('[pubmed] ID Converter response status:', convResp.status);
    if (convResp.ok) {
      const convJson = await convResp.json();
      const record = convJson?.records?.[0];
      if (record?.pmid) {
        console.log('[pubmed] ID Converter found PMID:', record.pmid, 'PMCID:', record.pmcid);
        return record.pmid;
      }
    }
  } catch (err) {
    console.error('[pubmed] ID Converter error:', err);
  }

  // Strategy 2: ESearch fallback
  try {
    const searchUrl = `${ESEARCH_URL}?db=pubmed&term=${encodeURIComponent(doi)}[doi]&retmode=json`;
    console.log('[pubmed] ESearch fallback by DOI:', searchUrl);
    const resp = await fetchWithTimeout(searchUrl);
    console.log('[pubmed] ESearch response status:', resp.status);
    if (!resp.ok) return null;

    const json = await resp.json();
    const ids: string[] = json?.esearchresult?.idlist || [];
    console.log('[pubmed] ESearch found PMIDs:', ids);
    return ids.length > 0 ? ids[0] : null;
  } catch (err) {
    console.error('[pubmed] ESearch findPmidByDoi error:', err);
    return null;
  }
}

/**
 * Use NCBI ID Converter to find both PMID and PMCID from a DOI in one call.
 * Returns { pmid, pmcid } — either or both may be null.
 */
export async function findIdsByDoi(doi: string): Promise<{ pmid: string | null; pmcid: string | null }> {
  if (!doi) return { pmid: null, pmcid: null };

  try {
    const url = `${IDCONV_URL}?ids=${encodeURIComponent(doi)}&format=json`;
    console.log('[pubmed] ID Converter (full) lookup:', url);
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return { pmid: null, pmcid: null };

    const json = await resp.json();
    const record = json?.records?.[0];
    const pmid = record?.pmid || null;
    const pmcid = record?.pmcid || null;
    console.log('[pubmed] ID Converter result — PMID:', pmid, 'PMCID:', pmcid);
    return { pmid, pmcid };
  } catch (err) {
    console.error('[pubmed] ID Converter (full) error:', err);
    return { pmid: null, pmcid: null };
  }
}

/**
 * Search PubMed by article title (and optionally first author) to find a PMID.
 * This is a reliable fallback when DOI-based lookups fail.
 * Returns the PMID string if a confident match is found, or null.
 */
export async function findPmidByTitle(
  title: string,
  firstAuthor?: string
): Promise<string | null> {
  if (!title || title.length < 10) return null;

  try {
    // Build a PubMed search query: title in [ti] field, optionally with author
    let query = `${title}[ti]`;
    if (firstAuthor) {
      query += ` AND ${firstAuthor}[au]`;
    }

    const searchUrl = `${ESEARCH_URL}?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=3`;
    console.log('[pubmed] Title search:', searchUrl);
    const resp = await fetchWithTimeout(searchUrl);
    console.log('[pubmed] Title search response status:', resp.status);
    if (!resp.ok) return null;

    const json = await resp.json();
    const ids: string[] = json?.esearchresult?.idlist || [];
    const count = parseInt(json?.esearchresult?.count || '0', 10);
    console.log('[pubmed] Title search found', count, 'results, IDs:', ids);

    // Only use the result if we got exactly 1 match (high confidence)
    // or if we got a small number with author filter
    if (ids.length === 1) {
      return ids[0];
    }
    if (ids.length > 1 && ids.length <= 3 && firstAuthor) {
      // Multiple results but we had author filter — take the first
      return ids[0];
    }

    return null;
  } catch (err) {
    console.error('[pubmed] Title search error:', err);
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
