/**
 * Crossref DOI metadata lookup helper.
 *
 * Uses the free Crossref REST API to fetch article metadata by DOI.
 * No API key required; we set a polite User-Agent with a contact email
 * per Crossref etiquette guidelines.
 *
 * If anything fails, returns null — the caller should treat this as
 * "no extra data available" and continue with whatever it already has.
 */

const CROSSREF_WORKS_URL = 'https://api.crossref.org/works';

/** Timeout for each HTTP request (5 seconds). */
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Polite User-Agent per Crossref guidelines.
 * Using a generic project identifier — replace the email if needed.
 */
const USER_AGENT = 'QuizForge/1.0 (mailto:quizforge@example.com)';

/** What we get back from a Crossref lookup. */
export interface CrossrefResult {
  doi: string;
  title: string | null;
  authors: { family: string; given: string }[];
  journal_title: string | null;
  journal_abbreviation: string | null;
  issn: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publication_date: string | null;
  year: number | null;
}

/**
 * Look up an article by DOI and return metadata from Crossref.
 * Returns null if the lookup fails or DOI is not found.
 */
export async function lookupByDoi(doi: string): Promise<CrossrefResult | null> {
  if (!doi) return null;

  try {
    // Crossref expects the DOI path-encoded in the URL
    const url = `${CROSSREF_WORKS_URL}/${encodeURIComponent(doi)}`;
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;

    const json = await resp.json();
    const work = json?.message;
    if (!work) return null;

    // Extract authors (up to 3)
    const authors = (work.author || []).slice(0, 3).map((a: { family?: string; given?: string }) => ({
      family: a.family || '',
      given: a.given || '',
    }));

    // Extract publication date from date-parts: [[year, month, day]]
    let publicationDate: string | null = null;
    let year: number | null = null;
    const dateParts = work.published?.['date-parts']?.[0]
      || work['published-print']?.['date-parts']?.[0]
      || work['published-online']?.['date-parts']?.[0];
    if (Array.isArray(dateParts) && dateParts.length > 0) {
      year = dateParts[0] || null;
      if (dateParts.length >= 3) {
        publicationDate = `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}-${String(dateParts[2]).padStart(2, '0')}`;
      } else if (dateParts.length === 2) {
        publicationDate = `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}`;
      } else {
        publicationDate = String(dateParts[0]);
      }
    }

    // Extract ISSN (prefer print, then electronic)
    const issnArray: string[] = work.ISSN || [];
    const issn = issnArray[0] || null;

    // Journal title: prefer short-container-title (abbreviation), fall back to container-title
    const journalTitle = work['container-title']?.[0] || null;
    const journalAbbrev = work['short-container-title']?.[0] || null;

    return {
      doi,
      title: Array.isArray(work.title) ? work.title[0] : (work.title || null),
      authors,
      journal_title: journalTitle,
      journal_abbreviation: journalAbbrev,
      issn,
      volume: work.volume || null,
      issue: work.issue || null,
      pages: work.page || null,
      publication_date: publicationDate,
      year,
    };
  } catch {
    // Any network/parse error → return null so the pipeline continues
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Fetch with a timeout and polite User-Agent. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}
