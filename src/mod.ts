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

// Doc comments below are placed *inside* the export braces, immediately
// before each specifier — not above the whole statement. deno_doc (and JSR's
// doc-coverage check) resolves a re-exported symbol as an unresolved
// "reference" node with no JSDoc whenever its origin file is itself a
// separate deno.json entrypoint, discarding a comment placed above the
// statement. A comment attached to the individual specifier survives.
export {
  /**
   * Dune plugin factory for PDF serving and search indexing.
   *
   * Registers a public GET route at `{config.route}/:filename` that serves
   * PDF files from `config.dir`, and (when `config.index` is true) hooks into
   * `onSearchRecordsCollect` to extract and index PDF text.
   */
  default,
} from "./plugin.ts";
export type {
  /** Configuration accepted from the `site.yaml` plugin entry. */
  PdfPluginConfig,
} from "./plugin.ts";
export {
  /** Extract concatenated and per-page plain text from a PDF file. */
  extractPdfText,
} from "./extract.ts";
export type {
  /** Result of {@link extractPdfText} — concatenated text, per-page text, and page count. */
  PdfTextResult,
} from "./extract.ts";
export {
  /** Create a request handler that serves PDF files from a directory. */
  createPdfHandler,
} from "./handler.ts";
export type {
  /** Options for {@link createPdfHandler}. */
  PdfHandlerOptions,
} from "./handler.ts";
export {
  /**
   * Preact island that renders a paginated in-browser PDF viewer.
   *
   * Served as a client bundle at `/plugins/pdf/viewer.js` when the plugin is
   * registered. Import it in a template with a `<script>` tag or use it
   * directly as a Preact component.
   */
  default as PDFViewer,
} from "./viewer.tsx";
export type {
  /** Labels for all UI strings — override to localise. */
  PDFViewerLabels,
  /** Props for the {@link PDFViewer} Preact island. */
  PDFViewerProps,
} from "./viewer.tsx";
