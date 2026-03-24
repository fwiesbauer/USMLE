import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichSourceMetadata } from './enrich';
import type { SourceMetadata } from '@/lib/ai/extract-source-reference';

// ---------------------------------------------------------------------------
// Mock the external lookup modules so tests never make real HTTP calls
// ---------------------------------------------------------------------------

vi.mock('./pubmed', () => ({
  lookupByPmid: vi.fn(),
  findPmidByDoi: vi.fn(),
}));

vi.mock('./crossref', () => ({
  lookupByDoi: vi.fn(),
}));

import { lookupByPmid, findPmidByDoi } from './pubmed';
import { lookupByDoi } from './crossref';

const mockedLookupByPmid = vi.mocked(lookupByPmid);
const mockedFindPmidByDoi = vi.mocked(findPmidByDoi);
const mockedLookupByDoi = vi.mocked(lookupByDoi);

// ---------------------------------------------------------------------------
// Helper to build a minimal SourceMetadata for testing
// ---------------------------------------------------------------------------

function makeMetadata(overrides: Partial<SourceMetadata> = {}): SourceMetadata {
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
    doi: null,
    pmid: null,
    pmcid: null,
    issn: null,
    keywords: [],
    document_type: 'journal_article',
    suggested_filename: 'document.pdf',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

describe('enrichSourceMetadata', () => {
  it('returns metadata unchanged when no PMID and no DOI', async () => {
    const input = makeMetadata({ article_title: 'Test Article' });
    const result = await enrichSourceMetadata(input);

    expect(result.article_title).toBe('Test Article');
    expect(mockedLookupByPmid).not.toHaveBeenCalled();
    expect(mockedLookupByDoi).not.toHaveBeenCalled();
    expect(mockedFindPmidByDoi).not.toHaveBeenCalled();
  });

  it('does not mutate the input object', async () => {
    const input = makeMetadata({ pmid: '12345678', keywords: ['original'] });
    mockedLookupByPmid.mockResolvedValue({
      pmid: '12345678',
      pmcid: 'PMC9999999',
      title: 'PubMed Title',
      authors: [],
      journal_title: null,
      journal_abbreviation: null,
      issn: null,
      volume: null,
      issue: null,
      pages: null,
      publication_date: null,
      doi: null,
      mesh_terms: ['Heart Failure'],
      author_keywords: [],
    });

    const result = await enrichSourceMetadata(input);

    // Input should be untouched
    expect(input.keywords).toEqual(['original']);
    expect(input.pmcid).toBeNull();

    // Result should have the new data
    expect(result.pmcid).toBe('PMC9999999');
    expect(result.keywords).toContain('Heart Failure');
  });

  it('Path A: enriches from PubMed when PMID is present', async () => {
    mockedLookupByPmid.mockResolvedValue({
      pmid: '12345678',
      pmcid: 'PMC9999999',
      title: 'PubMed Title',
      authors: [{ family: 'Smith', given: 'John' }],
      journal_title: 'The Lancet',
      journal_abbreviation: 'Lancet',
      issn: '0140-6736',
      volume: '400',
      issue: '10',
      pages: '100-110',
      publication_date: '2024 Jan',
      doi: '10.1016/example',
      mesh_terms: ['Myocardial Infarction', 'Heart Failure'],
      author_keywords: ['troponin', 'cardiac biomarkers'],
    });

    const input = makeMetadata({ pmid: '12345678' });
    const result = await enrichSourceMetadata(input);

    expect(mockedLookupByPmid).toHaveBeenCalledWith('12345678');
    expect(mockedLookupByDoi).not.toHaveBeenCalled();

    expect(result.pmcid).toBe('PMC9999999');
    expect(result.journal_title).toBe('The Lancet');
    expect(result.doi).toBe('10.1016/example');
    expect(result.keywords).toContain('troponin');
    expect(result.keywords).toContain('Myocardial Infarction');
  });

  it('Path A: does not overwrite existing fields with PubMed data', async () => {
    mockedLookupByPmid.mockResolvedValue({
      pmid: '12345678',
      pmcid: 'PMC9999999',
      title: 'PubMed Title',
      authors: [{ family: 'Different', given: 'Author' }],
      journal_title: 'Different Journal',
      journal_abbreviation: null,
      issn: null,
      volume: null,
      issue: null,
      pages: null,
      publication_date: null,
      doi: null,
      mesh_terms: [],
      author_keywords: [],
    });

    const input = makeMetadata({
      pmid: '12345678',
      article_title: 'My Original Title',
      journal_title: 'My Original Journal',
      authors: [{ family: 'Original', given: 'Author' }],
    });
    const result = await enrichSourceMetadata(input);

    // Existing values should NOT be overwritten
    expect(result.article_title).toBe('My Original Title');
    expect(result.journal_title).toBe('My Original Journal');
    expect(result.authors[0].family).toBe('Original');

    // But missing fields should be filled
    expect(result.pmcid).toBe('PMC9999999');
  });

  it('Path B: enriches from Crossref + PubMed when DOI is present', async () => {
    mockedLookupByDoi.mockResolvedValue({
      doi: '10.1016/example',
      title: 'Crossref Title',
      authors: [{ family: 'Jones', given: 'Alice' }],
      journal_title: 'Nature Medicine',
      journal_abbreviation: 'Nat Med',
      issn: '1078-8956',
      volume: '30',
      issue: '5',
      pages: '500-510',
      publication_date: '2024-05-01',
      year: 2024,
    });

    mockedFindPmidByDoi.mockResolvedValue('87654321');

    mockedLookupByPmid.mockResolvedValue({
      pmid: '87654321',
      pmcid: 'PMC1111111',
      title: 'PubMed Title',
      authors: [],
      journal_title: null,
      journal_abbreviation: null,
      issn: null,
      volume: null,
      issue: null,
      pages: null,
      publication_date: null,
      doi: '10.1016/example',
      mesh_terms: ['Immunotherapy'],
      author_keywords: ['checkpoint inhibitor'],
    });

    const input = makeMetadata({ doi: '10.1016/example' });
    const result = await enrichSourceMetadata(input);

    // Crossref data
    expect(result.journal_title).toBe('Nature Medicine');
    expect(result.year).toBe(2024);

    // Discovered PMID
    expect(result.pmid).toBe('87654321');
    expect(result.pmcid).toBe('PMC1111111');

    // PubMed keywords
    expect(result.keywords).toContain('Immunotherapy');
    expect(result.keywords).toContain('checkpoint inhibitor');
  });

  it('Path B: works with Crossref only when PubMed search returns nothing', async () => {
    mockedLookupByDoi.mockResolvedValue({
      doi: '10.1016/example',
      title: 'Crossref Only',
      authors: [],
      journal_title: 'Some Journal',
      journal_abbreviation: null,
      issn: null,
      volume: null,
      issue: null,
      pages: null,
      publication_date: null,
      year: 2023,
    });

    mockedFindPmidByDoi.mockResolvedValue(null);

    const input = makeMetadata({ doi: '10.1016/example' });
    const result = await enrichSourceMetadata(input);

    expect(result.article_title).toBe('Crossref Only');
    expect(result.journal_title).toBe('Some Journal');
    expect(result.pmid).toBeNull();

    // PubMed lookup by PMID should NOT be called since no PMID was found
    expect(mockedLookupByPmid).not.toHaveBeenCalled();
  });

  it('handles PubMed lookup failure gracefully', async () => {
    mockedLookupByPmid.mockResolvedValue(null);

    const input = makeMetadata({ pmid: '12345678', article_title: 'Keep This' });
    const result = await enrichSourceMetadata(input);

    expect(result.article_title).toBe('Keep This');
    expect(result.pmid).toBe('12345678');
  });

  it('handles Crossref lookup failure gracefully', async () => {
    mockedLookupByDoi.mockResolvedValue(null);
    mockedFindPmidByDoi.mockResolvedValue(null);

    const input = makeMetadata({ doi: '10.1016/example', article_title: 'Keep This' });
    const result = await enrichSourceMetadata(input);

    expect(result.article_title).toBe('Keep This');
    expect(result.doi).toBe('10.1016/example');
  });

  it('handles unexpected exceptions gracefully (safety net)', async () => {
    mockedLookupByPmid.mockRejectedValue(new Error('Unexpected crash'));

    const input = makeMetadata({ pmid: '12345678', article_title: 'Safe' });
    const result = await enrichSourceMetadata(input);

    // Should return the original metadata, not throw
    expect(result.article_title).toBe('Safe');
  });

  it('deduplicates keywords case-insensitively', async () => {
    mockedLookupByPmid.mockResolvedValue({
      pmid: '12345678',
      pmcid: null,
      title: null,
      authors: [],
      journal_title: null,
      journal_abbreviation: null,
      issn: null,
      volume: null,
      issue: null,
      pages: null,
      publication_date: null,
      doi: null,
      mesh_terms: ['Heart Failure', 'Diabetes'],
      author_keywords: ['heart failure', 'New Keyword'],
    });

    const input = makeMetadata({
      pmid: '12345678',
      keywords: ['Heart Failure', 'Existing'],
    });
    const result = await enrichSourceMetadata(input);

    // "Heart Failure" already exists (case-insensitive) — should not be duplicated
    const heartFailureCount = result.keywords.filter(
      (k) => k.toLowerCase() === 'heart failure'
    ).length;
    expect(heartFailureCount).toBe(1);

    // New keywords should be added
    expect(result.keywords).toContain('Existing');
    expect(result.keywords).toContain('New Keyword');
    expect(result.keywords).toContain('Diabetes');
  });
});
