import { createCompletion, getFastModel, type AIProvider } from './providers';

/**
 * Extracts a formatted bibliographic reference from source text.
 * Uses a fast, cheap model call to keep costs low.
 *
 * - For scientific papers/guidelines: returns NEJM-style numbered reference.
 * - For other documents: returns a descriptive title with authors if available.
 *
 * Returns both the formatted reference and any DOI found.
 */
export async function extractSourceReference(
  sourceText: string,
  apiKey: string,
  provider: AIProvider = 'anthropic'
): Promise<{ reference: string; doi: string }> {
  // Send only the first ~4000 chars — bibliographic info is always near the top
  const excerpt = sourceText.slice(0, 4000);

  // First, try to extract DOI via regex from the source text (more reliable)
  const doi = extractDoiFromText(sourceText);

  const prompt = `Analyze the following document excerpt. Your job is to extract a formatted source reference.

RULES:
1. If this is a scientific paper or clinical guideline, extract the bibliographic details and format as a single NEJM-style numbered reference:
   "1. Author(s). Title. Journal Abbreviation. Year;Volume(Issue):Pages."
   - Authors: Full list if ≤6 (Surname Initials, no periods between initials); first 3 + "et al" if >6.
   - Title: Exact title in sentence case.
   - Journal: Abbreviate per PubMed/NLM conventions.
   - Include DOI if present.
   - Do NOT invent or assume any details — use ONLY what is in the document.

2. If this is NOT a scientific paper (e.g. textbook chapter, lecture notes, protocol document):
   - If the document has a title, use it.
   - If authors are indicated, include them.
   - Format similarly: "1. Author(s). Title. Publisher/Source; Year." or just "1. Title." if minimal info.
   - If no title exists, create a brief descriptive working title based on the content (max 15 words).

3. Output ONLY the single formatted reference line. No explanation, no preamble.

DOCUMENT EXCERPT:
${excerpt}`;

  const responseText = await createCompletion({
    apiKey,
    provider,
    model: getFastModel(provider),
    maxTokens: 400,
    prompt,
  });

  // Clean up: remove leading/trailing whitespace, ensure it starts with "1."
  let ref = responseText.trim();
  if (!ref.startsWith('1.')) {
    ref = '1. ' + ref;
  }

  // If we didn't find a DOI via regex, try to extract from the AI-generated reference
  const finalDoi = doi || extractDoiFromText(ref);

  return { reference: ref, doi: finalDoi };
}

/**
 * Extracts a DOI from text using regex.
 * DOIs typically look like: 10.XXXX/...
 * They appear in URLs like https://doi.org/10.1016/... or as plain text.
 */
export function extractDoiFromText(text: string): string {
  // Match DOI patterns — both in URLs and standalone
  // DOI format: 10.XXXX/... where XXXX is 4+ digit registrant code
  const patterns = [
    // URL form: https://doi.org/10.XXXX/...
    /https?:\/\/doi\.org\/(10\.\d{4,}\/[^\s,;)}\]"']+)/i,
    // URL form: doi.org/10.XXXX/...
    /doi\.org\/(10\.\d{4,}\/[^\s,;)}\]"']+)/i,
    // Plain DOI: DOI: 10.XXXX/... or doi:10.XXXX/...
    /doi[:\s]+\s*(10\.\d{4,}\/[^\s,;)}\]"']+)/i,
    // Standalone: 10.XXXX/...
    /\b(10\.\d{4,}\/[^\s,;)}\]"']+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      // Clean trailing periods or punctuation
      return match[1].replace(/[.)]+$/, '');
    }
  }

  return '';
}
