import pdfParse from 'pdf-parse';

const MAX_TEXT_LENGTH = 100_000;
const MIN_WORD_COUNT = 500;

export interface PDFExtractionResult {
  text: string;
  wordCount: number;
  pageCount: number;
  preview: string;
  warning?: string;
}

export async function extractTextFromPDF(
  buffer: Buffer
): Promise<PDFExtractionResult> {
  const data = await pdfParse(buffer);

  const text = data.text.trim();

  if (!text || text.length < 50) {
    throw new Error(
      'This PDF appears to be a scanned image. Please upload a PDF with selectable text.'
    );
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const truncatedText =
    text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const preview = text.slice(0, 500);

  let warning: string | undefined;
  if (wordCount < MIN_WORD_COUNT) {
    warning =
      'This PDF contains very little text. It may be a scanned image or have limited content. Question quality may be affected.';
  }

  return {
    text: truncatedText,
    wordCount,
    pageCount: data.numpages,
    preview,
    warning,
  };
}
