/**
 * @dune/plugin-pdf — Dune plugin entry point.
 *
 * Registers PDF serving and search indexing via the Dune plugin API, so a
 * site enables everything by adding the plugin to `site.yaml` — no manual
 * route wiring or build scripts required:
 *
 * ```yaml
 * # site.yaml
 * plugins:
 *   - src: "jsr:@dune/plugin-pdf"
 *     config:
 *       dir: "static/pdfs"   # directory of PDF files (default: static/pdfs)
 *       route: "/pdf"        # URL prefix to serve them at (default: /pdf)
 *       index: true          # extract + index PDF text for search (default: true)
 * ```
 *
 * What it wires:
 * - A public route `{route}/:filename` serving PDFs from `dir`
 * - The `onSearchRecordsCollect` hook: extracts text from each PDF and injects
 *   it into the search index (results link to `{route}/{filename}`)
 * - A `viewer` client bundle exposing {@link PDFViewer} at
 *   `/plugins/pdf/viewer.js`
 *
 * The lower-level building blocks (`createPdfHandler`, `extractPdfText`,
 * `PDFViewer`) remain exported from the package root for custom wiring.
 *
 * @module
 */

import { isAbsolute, join } from "@std/path";
import { createPdfHandler } from "./handler.ts";
import { extractPdfText } from "./extract.ts";

/** Configuration accepted from the `site.yaml` plugin entry. */
export interface PdfPluginConfig {
  /**
   * Directory containing PDF files. Relative paths resolve against the site
   * root (the server's working directory).
   * @default "static/pdfs"
   */
  dir?: string;
  /**
   * URL prefix the PDFs are served at.
   * @default "/pdf"
   */
  route?: string;
  /**
   * Extract and index PDF text into the search index.
   * @default true
   */
  index?: boolean;
  /** Cache-Control header for served PDFs. */
  cacheControl?: string;
}

/**
 * A search record contributed to Dune's `onSearchRecordsCollect` hook.
 * Mirrors core's `InjectedSearchRecord` structurally so this package needs no
 * runtime dependency on `@dune/core`.
 */
interface InjectedSearchRecord {
  route: string;
  title: string;
  body: string;
  fields?: Record<string, string>;
  template?: string;
}

/** Minimal structural view of the parts of the Dune plugin API used here. */
interface DunePluginLike {
  name: string;
  version: string;
  description?: string;
  hooks: Record<string, (ctx: unknown) => unknown | Promise<unknown>>;
  // deno-lint-ignore no-explicit-any
  publicRoutes?: Array<{ method?: string; path: string; handler: (fc: any) => unknown }>;
  clientEntries?: Record<string, string>;
}

const PLUGIN_VERSION = "0.3.0";

/** Resolve a possibly-relative directory against the site root. */
function resolveDir(dir: string): string {
  return isAbsolute(dir) ? dir : join(Deno.cwd(), dir);
}

/** Turn a PDF filename into a human-readable title. */
function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Plugin factory. The Dune loader calls this with the merged plugin config
 * from `site.yaml`.
 */
export default function pdfPlugin(config: PdfPluginConfig = {}): DunePluginLike {
  const dir = resolveDir(config.dir ?? "static/pdfs");
  const routeBase = (config.route ?? "/pdf").replace(/\/+$/, "") || "/pdf";
  const index = config.index ?? true;

  const serve = createPdfHandler({ dir, cacheControl: config.cacheControl });

  const plugin: DunePluginLike = {
    name: "pdf",
    version: PLUGIN_VERSION,
    description: "Serve and search PDF files.",
    hooks: {},
    publicRoutes: [
      {
        method: "GET",
        path: `${routeBase}/:filename`,
        // Bridge Fresh's single-arg context to createPdfHandler's (req, ctx) shape.
        // deno-lint-ignore no-explicit-any
        handler: (fc: any) =>
          serve(fc.req, { params: { filename: fc.params?.filename ?? "" } }),
      },
    ],
    clientEntries: {
      viewer: import.meta.resolve("./client.tsx"),
    },
  };

  if (index) {
    plugin.hooks.onSearchRecordsCollect = async (ctx: unknown) => {
      const records = (ctx as { data: { records: InjectedSearchRecord[] } }).data.records;
      let entries: Deno.DirEntry[];
      try {
        entries = [...Deno.readDirSync(dir)];
      } catch {
        // Directory absent or unreadable — nothing to index.
        return;
      }

      for (const entry of entries) {
        if (!entry.isFile || !entry.name.toLowerCase().endsWith(".pdf")) continue;
        try {
          const { text } = await extractPdfText(join(dir, entry.name));
          if (!text) continue;
          records.push({
            route: `${routeBase}/${entry.name}`,
            title: titleFromFilename(entry.name),
            body: text,
            template: "pdf",
          });
        } catch (err) {
          console.warn(
            `[dune/plugin-pdf] failed to extract text from ${entry.name}: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }
    };
  }

  return plugin;
}

// The loader reads `.pluginName` to look up config before invoking the factory.
pdfPlugin.pluginName = "pdf";
