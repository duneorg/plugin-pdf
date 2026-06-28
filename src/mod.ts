/**
 * @dune/pdf
 *
 * PDF archive plugin for Dune sites. Provides:
 *
 * - **PDF serving** — a secure route handler that serves PDF files from a
 *   configured directory (`@dune/pdf/handler`)
 * - **Text extraction** — plain text extraction from PDFs for search indexing
 *   (`@dune/pdf/extract`)
 *
 * ## Usage
 *
 * ### 1. Serve PDFs
 *
 * Create `routes/pdf/[filename].ts`:
 * ```ts
 * import { createPdfHandler } from "@dune/pdf-archive/handler";
 * import { join } from "@std/path";
 *
 * const PDF_DIR = join(Deno.cwd(), "static", "pdfs");
 *
 * export const handler = { GET: createPdfHandler({ dir: PDF_DIR }) };
 * ```
 *
 * ### 2. Index PDF text for search
 *
 * In your build script or a Dune hook:
 * ```ts
 * import { extractPdfText } from "@dune/pdf-archive/extract";
 *
 * const result = await extractPdfText("/path/to/issue.pdf");
 * // result.text — concatenated text of all pages
 * // result.pages — per-page text array
 * // result.pageCount — total pages
 * ```
 *
 * ## Design notes
 *
 * Text extraction uses `unpdf` (which wraps PDF.js) to obtain plain
 * concatenated text. It does not perform layout analysis. For structured
 * extraction (column detection, footnotes, etc.) build on top of `unpdf`
 * directly with a publication-specific implementation.
 *
 * Search engine integration (injecting PDF text as search records) is
 * performed by the consuming site, since Dune's search index is built from
 * content pages at startup. Use the `extractPdfText` utility in a build
 * script and write the results as content files, or integrate via a custom
 * plugin hook once Dune supports search record injection.
 *
 * @module
 */

export { extractPdfText } from "./extract.ts";
export type { PdfTextResult } from "./extract.ts";
export { createPdfHandler } from "./handler.ts";
export type { PdfHandlerOptions } from "./handler.ts";
export { default as PDFViewer } from "./viewer.tsx";
export type { PDFViewerLabels, PDFViewerProps } from "./viewer.tsx";
