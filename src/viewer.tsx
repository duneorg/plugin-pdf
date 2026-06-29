/**
 * PDFViewer — a Preact island for rendering PDF files in the browser.
 *
 * Requires PDF.js to be loaded as a global before the island hydrates.
 * Add to your template:
 *
 * ```tsx
 * <script src="/static/pdf.min.js" />
 * ```
 *
 * And set the worker source (either in the template or via the `workerSrc` prop):
 *
 * ```tsx
 * <PDFViewer pdfUrl="/static/pdfs/doc.pdf" workerSrc="/static/pdf.worker.min.js" />
 * ```
 *
 * PDF.js binaries (`pdf.min.js`, `pdf.worker.min.js`) can be downloaded from
 * https://github.com/mozilla/pdf.js/releases — use the "legacy" build for
 * broadest browser compatibility.
 *
 * @module
 */

/** @jsxImportSource preact */
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** Labels for all UI strings — override to localise. */
export interface PDFViewerLabels {
  firstPage?: string;
  prevPage?: string;
  nextPage?: string;
  lastPage?: string;
  print?: string;
  download?: string;
}

export interface PDFViewerProps {
  /** URL of the PDF to display. */
  pdfUrl: string;
  /**
   * URL of the PDF.js worker script.
   * @default "/static/pdf.worker.min.js"
   */
  workerSrc?: string;
  /** Override UI label strings for localisation. */
  labels?: PDFViewerLabels;
}

const DEFAULT_LABELS: Required<PDFViewerLabels> = {
  firstPage: "First page",
  prevPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  print: "Print",
  download: "Download",
};

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
    </svg>
  );
}

function ChevronBarLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.854 3.646a.5.5 0 0 1 0 .708L8.207 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0zM4.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 1 0v-13a.5.5 0 0 0-.5-.5z" />
    </svg>
  );
}

function ChevronBarRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.146 3.646a.5.5 0 0 0 0 .708L7.793 8l-3.647 3.646a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708 0zM11.5 1a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0v-13a.5.5 0 0 1 .5-.5z" />
    </svg>
  );
}

export default function PDFViewer(
  { pdfUrl, workerSrc = "/static/pdf.worker.min.js", labels = {} }:
    PDFViewerProps,
): JSX.Element {
  const l = { ...DEFAULT_LABELS, ...labels };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<unknown>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  type PdfDoc = { getPage(n: number): Promise<unknown>; numPages: number };
  const [pdfDoc, setPdfDoc] = useState<PdfDoc | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      // deno-lint-ignore no-explicit-any
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        console.error(
          "[dune/plugin-pdf] PDF.js not loaded — add <script src='/static/pdf.min.js' /> to your template",
        );
        return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise as PdfDoc;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        const hash = globalThis.location.hash;
        const pageMatch = hash.match(/page=(\d+)/);
        const initialPage = pageMatch ? parseInt(pageMatch[1]) : 1;
        setPageNum(initialPage);
        renderPage(pdf, initialPage);
      } catch (error) {
        console.error("[dune/plugin-pdf] Error loading PDF:", error);
      }
    };
    loadPDF();
  }, [pdfUrl]);

  const renderPage = async (
    pdf: { getPage(n: number): Promise<unknown> },
    pageNumber: number,
  ) => {
    if (!canvasRef.current || !containerRef.current) return;
    if (renderTaskRef.current) {
      (renderTaskRef.current as { cancel(): void }).cancel();
      renderTaskRef.current = null;
    }

    const page = await pdf.getPage(pageNumber) as {
      getViewport(opts: { scale: number }): { width: number; height: number };
      render(
        opts: {
          canvasContext: CanvasRenderingContext2D | null;
          viewport: unknown;
        },
      ): { promise: Promise<void> };
    };
    const containerWidth = containerRef.current.clientWidth;
    const pageViewport = page.getViewport({ scale: 1.0 });
    const calculatedScale = containerWidth / pageViewport.width;
    const viewport = page.getViewport({ scale: calculatedScale });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    context!.setTransform(1, 0, 0, 1, 0, 0);

    renderTaskRef.current = page.render({ canvasContext: context, viewport });
    try {
      await (renderTaskRef.current as { promise: Promise<void> }).promise;
      renderTaskRef.current = null;
    } catch (error: unknown) {
      if (
        (error as { name?: string })?.name !== "RenderingCancelledException"
      ) {
        console.error("[dune/plugin-pdf] Error rendering page:", error);
      }
    }
  };

  const goToPage = (newPageNum: number) => {
    if (newPageNum >= 1 && newPageNum <= numPages && pdfDoc) {
      setPageNum(newPageNum);
      renderPage(pdfDoc, newPageNum);
    }
  };

  useEffect(() => {
    if (!pdfDoc) return;
    const handleResize = () => renderPage(pdfDoc, pageNum);
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [pdfDoc, pageNum]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const ro = new ResizeObserver(() => renderPage(pdfDoc, pageNum));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [pdfDoc, pageNum]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const handleScroll = () => {
      el.scrollLeft = 0;
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let touchStartX = 0, touchStartY = 0;
    const SWIPE_THRESHOLD = 50, VERTICAL_THRESHOLD = 75;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = touchStartX - e.changedTouches[0].screenX;
      const diffY = Math.abs(touchStartY - e.changedTouches[0].screenY);
      if (Math.abs(diffX) > SWIPE_THRESHOLD && diffY < VERTICAL_THRESHOLD) {
        if (diffX > 0 && pageNum < numPages) goToPage(pageNum + 1);
        else if (diffX < 0 && pageNum > 1) goToPage(pageNum - 1);
      }
    };
    const el = containerRef.current;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pageNum, numPages, pdfDoc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;
      switch (e.key) {
        case "ArrowLeft":
          if (pageNum > 1) goToPage(pageNum - 1);
          break;
        case "ArrowRight":
          if (pageNum < numPages) goToPage(pageNum + 1);
          break;
        case "Home":
          goToPage(1);
          break;
        case "End":
          goToPage(numPages);
          break;
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [pageNum, numPages, pdfDoc]);

  const handlePrint = () => {
    const w = globalThis.open(pdfUrl, "_blank");
    if (w) w.addEventListener("load", () => w.print());
  };

  const Controls = () => (
    <div class="pdf-controls">
      <div class="pdf-nav-group">
        <button
          type="button"
          onClick={() => goToPage(1)}
          disabled={pageNum <= 1}
          class="pdf-control-btn"
          title={l.firstPage}
        >
          <ChevronBarLeft />
        </button>
        <button
          type="button"
          onClick={() => goToPage(pageNum - 1)}
          disabled={pageNum <= 1}
          class="pdf-control-btn"
          title={l.prevPage}
        >
          <ChevronLeft />
        </button>
      </div>
      <span class="pdf-page-info">
        <input
          type="number"
          value={pageNum}
          min="1"
          max={numPages}
          onChange={(e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            if (val && val >= 1 && val <= numPages) goToPage(val);
          }}
          class="pdf-page-input"
        />
        <span class="pdf-page-separator">/</span>
        <span class="pdf-total-pages">{numPages}</span>
      </span>
      <div class="pdf-nav-group">
        <button
          type="button"
          onClick={() => goToPage(pageNum + 1)}
          disabled={pageNum >= numPages}
          class="pdf-control-btn"
          title={l.nextPage}
        >
          <ChevronRight />
        </button>
        <button
          type="button"
          onClick={() => goToPage(numPages)}
          disabled={pageNum >= numPages}
          class="pdf-control-btn"
          title={l.lastPage}
        >
          <ChevronBarRight />
        </button>
      </div>
      <div class="pdf-toolbar-separator" />
      <button
        type="button"
        onClick={handlePrint}
        class="pdf-control-btn"
        title={l.print}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z" />
          <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
        </svg>
      </button>
      <a href={pdfUrl} download class="pdf-control-btn" title={l.download}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
        </svg>
      </a>
    </div>
  );

  return (
    <div class="pdf-viewer-container">
      <Controls />
      <div class="pdf-canvas-container" ref={containerRef}>
        {pageNum > 1 && (
          <button
            type="button"
            class="pdf-tap-zone pdf-tap-zone-left"
            onClick={() => goToPage(pageNum - 1)}
            aria-label={l.prevPage}
          >
            <svg
              class="pdf-tap-zone-icon"
              width="24"
              height="24"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
            </svg>
          </button>
        )}
        {pageNum < numPages && (
          <button
            type="button"
            class="pdf-tap-zone pdf-tap-zone-right"
            onClick={() => goToPage(pageNum + 1)}
            aria-label={l.nextPage}
          >
            <svg
              class="pdf-tap-zone-icon"
              width="24"
              height="24"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        )}
        <canvas ref={canvasRef} class="pdf-canvas" />
      </div>
      <Controls />
    </div>
  );
}
