/**
 * PDF serving route handler factory.
 *
 * Returns a Fresh-compatible GET handler that serves PDF files from a
 * configured directory. Includes path traversal protection and MIME type
 * enforcement.
 *
 * @module
 */

/** Options for the PDF route handler. */
export interface PdfHandlerOptions {
  /**
   * Absolute path to the directory containing PDF files.
   * @example "/var/www/mysite/static/pdfs"
   */
  dir: string;
  /**
   * Cache-Control header value for served PDFs.
   * @default "public, max-age=86400"
   */
  cacheControl?: string;
}

/**
 * Create a handler function that serves PDF files from `options.dir`.
 *
 * Designed to be used as a Fresh route handler:
 *
 * ```ts
 * // routes/pdf/[filename].ts
 * import { createPdfHandler } from "@dune/plugin-pdf/handler";
 *
 * export const handler = {
 *   GET: createPdfHandler({ dir: "/absolute/path/to/pdfs" }),
 * };
 * ```
 *
 * Security: rejects filenames containing `..` or `/`, and only serves `.pdf`
 * files. All other requests receive a 400 or 404 response.
 */
export function createPdfHandler(
  options: PdfHandlerOptions,
): (_req: Request, ctx: { params: { filename: string } }) => Promise<Response> {
  const { dir, cacheControl = "public, max-age=86400" } = options;

  return async function handler(
    _req: Request,
    ctx: { params: { filename: string } },
  ): Promise<Response> {
    const { filename } = ctx.params;

    // Security: reject empty, path-traversal, or non-PDF filenames.
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return new Response("Invalid filename", { status: 400 });
    }
    if (!filename.endsWith(".pdf")) {
      return new Response("Only PDF files are served at this route", {
        status: 400,
      });
    }

    try {
      const filePath = `${dir}/${filename}`;
      const data = await Deno.readFile(filePath);
      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": cacheControl,
        },
      });
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return new Response("PDF not found", { status: 404 });
      }
      console.error("[dune/plugin-pdf] Error serving PDF:", err);
      return new Response("Internal server error", { status: 500 });
    }
  };
}
