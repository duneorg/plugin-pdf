/**
 * Simple PDF text extraction for search indexing.
 *
 * Extracts plain concatenated text from all pages of a PDF using unpdf.
 * This is suitable for feeding into a search index. It does not perform
 * any layout analysis (column detection, footnote parsing, etc.) — for
 * publication-specific structured extraction, use a custom implementation
 * on top of unpdf directly.
 *
 * @module
 */

import { configureUnPDF, getDocumentProxy } from "unpdf";

let _configured = false;

async function ensureConfigured(): Promise<void> {
  if (_configured) return;
  await configureUnPDF({ pdfjs: () => import("unpdf/pdfjs") });
  _configured = true;
}

/** Result of a PDF text extraction. */
export interface PdfTextResult {
  /** Number of pages in the PDF. */
  pageCount: number;
  /**
   * Extracted text, one entry per page. Pages with no extractable text
   * (e.g. scanned image-only pages) have an empty string.
   */
  pages: string[];
  /** Concatenated text of all pages, joined by double newlines. */
  text: string;
}

/**
 * Extract plain text from a PDF file.
 *
 * @param pdfPath - Absolute path to the PDF file.
 * @returns Extracted text broken down by page plus a combined string.
 *
 * @example
 * ```ts
 * import { extractPdfText } from "@dune/plugin-pdf/extract";
 *
 * const result = await extractPdfText("/path/to/issue.pdf");
 * console.log(`${result.pageCount} pages, ${result.text.length} chars`);
 * ```
 */
export async function extractPdfText(pdfPath: string): Promise<PdfTextResult> {
  await ensureConfigured();

  const buffer = await Deno.readFile(pdfPath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));

  const pages: string[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await (page as unknown as {
      getTextContent(): Promise<{ items: Array<{ str: string }> }>;
    }).getTextContent();

    const pageText = content.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push(pageText);
  }

  return {
    pageCount: pdf.numPages,
    pages,
    text: pages.filter(Boolean).join("\n\n"),
  };
}
