/**
 * @dune/plugin-pdf
 *
 * PDF plugin for Dune sites. Serves PDF files and indexes their text for
 * search. Enable it from `site.yaml` with no manual wiring:
 *
 * ```yaml
 * plugins:
 *   - src: "jsr:@dune/plugin-pdf"
 *     config:
 *       dir: "static/pdfs"   # default: static/pdfs
 *       route: "/pdf"        # default: /pdf
 *       index: true          # extract + index PDF text (default: true)
 * ```
 *
 * The package's default export is the plugin factory (see `./plugin`). The
 * lower-level building blocks remain available for custom wiring:
 *
 * - **PDF serving** — `createPdfHandler` (`@dune/plugin-pdf/handler`)
 * - **Text extraction** — `extractPdfText` (`@dune/plugin-pdf/extract`)
 * - **Browser viewer** — `PDFViewer` island (`@dune/plugin-pdf/viewer`), or the
 *   auto-mounting client bundle served at `/plugins/pdf/viewer.js`
 *
 * ## Manual usage
 *
 * ### Serve PDFs
 *
 * Create `routes/pdf/[filename].ts`:
 * ```ts
 * import { createPdfHandler } from "@dune/plugin-pdf/handler";
 * import { join } from "@std/path";
 *
 * const PDF_DIR = join(Deno.cwd(), "static", "pdfs");
 *
 * export const handler = { GET: createPdfHandler({ dir: PDF_DIR }) };
 * ```
 *
 * ### Extract PDF text
 *
 * ```ts
 * import { extractPdfText } from "@dune/plugin-pdf/extract";
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
 * @module
 */

export { default } from "./plugin.ts";
export type { PdfPluginConfig } from "./plugin.ts";
export { extractPdfText } from "./extract.ts";
export type { PdfTextResult } from "./extract.ts";
export { createPdfHandler } from "./handler.ts";
export type { PdfHandlerOptions } from "./handler.ts";
export { default as PDFViewer } from "./viewer.tsx";
export type { PDFViewerLabels, PDFViewerProps } from "./viewer.tsx";
