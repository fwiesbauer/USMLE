import Anthropic from '@anthropic-ai/sdk';

/**
 * Extracts a formatted bibliographic reference from source text.
 * Uses a fast, cheap model call (Haiku) to keep costs low.
 *
 * - For scientific papers/guidelines: returns NEJM-style numbered reference.
 * - For other documents: returns a descriptive title with authors if available.
 */
export async function extractSourceReference(
  sourceText: string,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  // Send only the first ~4000 chars — bibliographic info is always near the top
  const excerpt = sourceText.slice(0, 4000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Analyze the following document excerpt. Your job is to extract a formatted source reference.

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
${excerpt}`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return '';
  }

  // Clean up: remove leading/trailing whitespace, ensure it starts with "1."
  let ref = textContent.text.trim();
  if (!ref.startsWith('1.')) {
    ref = '1. ' + ref;
  }
  return ref;
}
