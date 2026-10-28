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

import { basename, join } from "@std/path";
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

/**
 * Bump when the extraction output for the same file would change (unpdf
 * upgrade, whitespace handling), so older cache entries are ignored.
 */
const CACHE_FORMAT = 1;

interface CacheEntry {
  format: number;
  size: number;
  mtimeMs: number;
  pageCount: number;
  pages: string[];
}

/** Cache file for one PDF: its file name, URL-encoded, plus `.json`. */
function cachePathFor(cacheDir: string, pdfPath: string): string {
  return join(cacheDir, encodeURIComponent(basename(pdfPath)) + ".json");
}

/**
 * Like {@link extractPdfText}, but keeps the result on disk in `cacheDir` and
 * reuses it while the PDF's size and modification time are unchanged. A
 * missing, unreadable or mismatching entry is re-extracted and rewritten
 * (atomically); failing to write the cache never fails the extraction.
 *
 * @param pdfPath - Absolute path to the PDF file.
 * @param cacheDir - Directory for cache entries (created on demand).
 */
export async function extractPdfTextCached(
  pdfPath: string,
  cacheDir: string,
): Promise<PdfTextResult> {
  const info = await Deno.stat(pdfPath);
  const mtimeMs = info.mtime?.getTime() ?? 0;
  const cachePath = cachePathFor(cacheDir, pdfPath);

  try {
    const hit = JSON.parse(await Deno.readTextFile(cachePath)) as CacheEntry;
    if (
      hit.format === CACHE_FORMAT && hit.size === info.size &&
      hit.mtimeMs === mtimeMs && Array.isArray(hit.pages) &&
      hit.pages.length === hit.pageCount
    ) {
      return {
        pageCount: hit.pageCount,
        pages: hit.pages,
        text: hit.pages.filter(Boolean).join("\n\n"),
      };
    }
  } catch {
    // No usable entry: fall through and extract.
  }

  const result = await extractPdfText(pdfPath);

  try {
    await Deno.mkdir(cacheDir, { recursive: true });
    const entry: CacheEntry = {
      format: CACHE_FORMAT,
      size: info.size,
      mtimeMs,
      pageCount: result.pageCount,
      pages: result.pages,
    };
    const tmp = `${cachePath}.${crypto.randomUUID()}.tmp`;
    await Deno.writeTextFile(tmp, JSON.stringify(entry));
    await Deno.rename(tmp, cachePath);
  } catch {
    // Read-only or full disk: the result is still valid, just uncached.
  }

  return result;
}

/**
 * Delete cache entries whose PDF is no longer present.
 *
 * @param cacheDir - Directory holding cache entries.
 * @param pdfNames - File names (e.g. `"1993-1.pdf"`) that currently exist.
 */
export async function pruneCache(
  cacheDir: string,
  pdfNames: Iterable<string>,
): Promise<void> {
  const keep = new Set(
    [...pdfNames].map((n) => encodeURIComponent(n) + ".json"),
  );
  try {
    for await (const e of Deno.readDir(cacheDir)) {
      if (e.isFile && e.name.endsWith(".json") && !keep.has(e.name)) {
        await Deno.remove(join(cacheDir, e.name)).catch(() => {});
      }
    }
  } catch {
    // Cache directory absent: nothing to prune.
  }
}
