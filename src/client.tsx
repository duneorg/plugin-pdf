/**
 * Browser entry for the PDF viewer client bundle.
 *
 * Bundled by Dune as a plugin client entry and served at
 * `/plugins/pdf/viewer.js`. Loading it auto-mounts {@link PDFViewer} into any
 * element carrying a `data-pdf-viewer` attribute:
 *
 * ```html
 * <div data-pdf-viewer data-pdf-url="/pdf/issue-1.pdf"></div>
 * <script type="module" src="/plugins/pdf/viewer.js"></script>
 * ```
 *
 * Optional attributes:
 * - `data-worker-src` — PDF.js worker URL (default: `/static/pdf.worker.min.js`)
 *
 * PDF.js itself (`pdf.min.js`) must still be present as a global — see the
 * {@link PDFViewer} docs.
 *
 * @module
 */

/** @jsxImportSource preact */
import { render } from "preact";
import PDFViewer from "./viewer.tsx";

function mountAll(): void {
  const targets = document.querySelectorAll<HTMLElement>("[data-pdf-viewer]");
  for (const el of targets) {
    if (el.dataset.pdfMounted === "true") continue;
    const pdfUrl = el.dataset.pdfUrl;
    if (!pdfUrl) {
      console.warn("[dune/plugin-pdf] [data-pdf-viewer] element missing data-pdf-url");
      continue;
    }
    el.dataset.pdfMounted = "true";
    render(
      <PDFViewer pdfUrl={pdfUrl} workerSrc={el.dataset.workerSrc} />,
      el,
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll);
} else {
  mountAll();
}
