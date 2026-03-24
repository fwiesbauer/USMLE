/**
 * Metadata enrichment — single entry point.
 *
 * Call `enrichSourceMetadata(metadata)` after PDF extraction to optionally
 * fill in missing identifiers (PMID, PMCID, DOI) and keywords (MeSH terms,
 * author keywords) from PubMed and Crossref.
 *
 * RULES:
 *   - This is 100 % best-effort. If any lookup fails, the original metadata
 *     is returned unchanged.
 *   - External data only FILLS GAPS — it never overwrites a field that
 *     already has a value, except for keywords which are merged.
 *   - The function returns a new object; it does not mutate the input.
 *
 * LOOKUP STRATEGY:
 *   1. If we have a PMID → call PubMed directly.
 *   2. Else if we have a DOI → call Crossref for bibliographic data,
 *      then search PubMed by DOI to discover a PMID, then call PubMed
 *      for MeSH/keywords.
 *   3. If we have neither → skip, return input unchanged.
 */

import type { SourceMetadata } from '@/lib/ai/extract-source-reference';
import { lookupByPmid, findPmidByDoi, type PubMedResult } from './pubmed';
import { lookupByDoi, type CrossrefResult } from './crossref';

/**
 * Enrich the given source metadata with data from PubMed and/or Crossref.
 *
 * Always returns a valid SourceMetadata object — worst case, the same one
 * you passed in (with no changes).
 */
export async function enrichSourceMetadata(
  metadata: SourceMetadata
): Promise<SourceMetadata> {
  // Work on a shallow copy so we never mutate the caller's object.
  const enriched: SourceMetadata = { ...metadata, authors: [...metadata.authors], keywords: [...metadata.keywords] };

  try {
    const pmid = enriched.pmid || null;
    const doi = enriched.doi || null;

    // ------------------------------------------------------------------
    // Path A: We already have a PMID → go straight to PubMed
    // ------------------------------------------------------------------
    if (pmid) {
      const pubmed = await lookupByPmid(pmid);
      if (pubmed) {
        applyPubMed(enriched, pubmed);
      }
      return enriched;
    }

    // ------------------------------------------------------------------
    // Path B: No PMID, but we have a DOI → try Crossref, then PubMed
    // ------------------------------------------------------------------
    if (doi) {
      // B1: Crossref for bibliographic data
      const crossref = await lookupByDoi(doi);
      if (crossref) {
        applyCrossref(enriched, crossref);
      }

      // B2: Try to discover a PMID via PubMed search-by-DOI
      const discoveredPmid = await findPmidByDoi(doi);
      if (discoveredPmid) {
        enriched.pmid = discoveredPmid;

        // B3: Now that we have a PMID, get MeSH terms & keywords
        const pubmed = await lookupByPmid(discoveredPmid);
        if (pubmed) {
          applyPubMed(enriched, pubmed);
        }
      }

      return enriched;
    }

    // ------------------------------------------------------------------
    // Path C: Neither PMID nor DOI — nothing to look up
    // ------------------------------------------------------------------
    return enriched;
  } catch {
    // Absolute safety net: if anything unexpected happens, return
    // the original metadata so the pipeline is never disrupted.
    return metadata;
  }
}

// ---------------------------------------------------------------------------
// Merge helpers — only fill gaps, never overwrite existing values
// ---------------------------------------------------------------------------

/**
 * Merge PubMed data into our metadata.
 * PubMed is the most authoritative source for PMCID, MeSH, and keywords.
 */
function applyPubMed(target: SourceMetadata, source: PubMedResult): void {
  // Identifiers
  if (!target.pmid && source.pmid) target.pmid = source.pmid;
  if (!target.pmcid && source.pmcid) target.pmcid = source.pmcid;
  if (!target.doi && source.doi) target.doi = source.doi;

  // Bibliographic fields — only fill blanks
  if (!target.article_title && source.title) target.article_title = source.title;
  if (target.authors.length === 0 && source.authors.length > 0) target.authors = source.authors;
  if (!target.journal_title && source.journal_title) target.journal_title = source.journal_title;
  if (!target.journal_abbreviation && source.journal_abbreviation) target.journal_abbreviation = source.journal_abbreviation;
  if (!target.issn && source.issn) target.issn = source.issn;
  if (!target.volume && source.volume) target.volume = source.volume;
  if (!target.issue && source.issue) target.issue = source.issue;
  if (!target.pages && source.pages) target.pages = source.pages;
  if (!target.publication_date && source.publication_date) target.publication_date = source.publication_date;

  // Keywords — merge MeSH terms and author keywords into existing keywords
  // without creating duplicates.
  mergeKeywords(target, source.mesh_terms, source.author_keywords);
}

/**
 * Merge Crossref data into our metadata.
 * Crossref is good for DOI-linked bibliographic fields.
 */
function applyCrossref(target: SourceMetadata, source: CrossrefResult): void {
  if (!target.doi && source.doi) target.doi = source.doi;
  if (!target.article_title && source.title) target.article_title = source.title;
  if (target.authors.length === 0 && source.authors.length > 0) target.authors = source.authors;
  if (!target.journal_title && source.journal_title) target.journal_title = source.journal_title;
  if (!target.journal_abbreviation && source.journal_abbreviation) target.journal_abbreviation = source.journal_abbreviation;
  if (!target.issn && source.issn) target.issn = source.issn;
  if (!target.volume && source.volume) target.volume = source.volume;
  if (!target.issue && source.issue) target.issue = source.issue;
  if (!target.pages && source.pages) target.pages = source.pages;
  if (!target.publication_date && source.publication_date) target.publication_date = source.publication_date;
  if (!target.year && source.year) target.year = source.year;
}

/**
 * Merge MeSH terms and author keywords into the target's keywords array.
 * Uses case-insensitive deduplication so "Myocardial Infarction" and
 * "myocardial infarction" are not added twice.
 */
function mergeKeywords(
  target: SourceMetadata,
  meshTerms: string[],
  authorKeywords: string[]
): void {
  const existing = new Set(target.keywords.map((k) => k.toLowerCase()));

  // Author keywords first (they are the article's own terms),
  // then MeSH (broader controlled vocabulary).
  for (const kw of [...authorKeywords, ...meshTerms]) {
    const lower = kw.toLowerCase();
    if (!existing.has(lower)) {
      existing.add(lower);
      target.keywords.push(kw);
    }
  }
}
