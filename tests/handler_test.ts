/**
 * Tests for the PDF route handler.
 *
 * Uses a temporary directory with real files rather than mocking Deno.readFile,
 * since the handler uses Deno.readFile directly.
 */

import { assertEquals } from "jsr:@std/assert@^1";
import { join } from "jsr:@std/path@^1";
import { createPdfHandler } from "../src/handler.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "dune-pdf-archive-test-" });
}

function makeCtx(filename: string) {
  return { params: { filename } };
}

function makeReq() {
  return new Request("http://localhost/pdf/test.pdf");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test("handler: serves a PDF file with correct headers", async () => {
  const dir = await makeTempDir();
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF magic
  await Deno.writeFile(join(dir, "sample.pdf"), pdfBytes);

  const handler = createPdfHandler({ dir });
  const response = await handler(makeReq(), makeCtx("sample.pdf"));

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "application/pdf");
  assertEquals(
    response.headers.get("Content-Disposition"),
    'inline; filename="sample.pdf"',
  );

  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: 404 for missing file", async () => {
  const dir = await makeTempDir();
  const handler = createPdfHandler({ dir });
  const response = await handler(makeReq(), makeCtx("missing.pdf"));
  assertEquals(response.status, 404);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: 400 for path traversal attempt", async () => {
  const dir = await makeTempDir();
  const handler = createPdfHandler({ dir });

  const response = await handler(makeReq(), makeCtx("../secret.pdf"));
  assertEquals(response.status, 400);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: 400 for non-PDF extension", async () => {
  const dir = await makeTempDir();
  const handler = createPdfHandler({ dir });
  const response = await handler(makeReq(), makeCtx("script.js"));
  assertEquals(response.status, 400);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: 400 for filename with slash", async () => {
  const dir = await makeTempDir();
  const handler = createPdfHandler({ dir });
  const response = await handler(makeReq(), makeCtx("sub/dir.pdf"));
  assertEquals(response.status, 400);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: 400 for empty filename", async () => {
  const dir = await makeTempDir();
  const handler = createPdfHandler({ dir });
  const response = await handler(makeReq(), makeCtx(""));
  assertEquals(response.status, 400);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: custom Cache-Control header", async () => {
  const dir = await makeTempDir();
  await Deno.writeFile(
    join(dir, "a.pdf"),
    new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  );
  const handler = createPdfHandler({ dir, cacheControl: "no-cache" });
  const response = await handler(makeReq(), makeCtx("a.pdf"));
  assertEquals(response.headers.get("Cache-Control"), "no-cache");
  await Deno.remove(dir, { recursive: true });
});

Deno.test("handler: default Cache-Control is public max-age=86400", async () => {
  const dir = await makeTempDir();
  await Deno.writeFile(
    join(dir, "b.pdf"),
    new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  );
  const handler = createPdfHandler({ dir });
  const response = await handler(makeReq(), makeCtx("b.pdf"));
  assertEquals(response.headers.get("Cache-Control"), "public, max-age=86400");
  await Deno.remove(dir, { recursive: true });
});
