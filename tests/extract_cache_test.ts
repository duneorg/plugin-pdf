/**
 * Tests for the on-disk extraction cache. Uses a tiny hand-written PDF so
 * they run without external fixtures.
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1";
import { join } from "@std/path";
import { extractPdfTextCached, pruneCache } from "../src/extract.ts";

function tinyPdf(word: string): Uint8Array {
  const stream = `BT /F1 24 Tf 20 100 Td (${word}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R " +
    "/Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${
    objs.length + 1
  } /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

async function withTmp(fn: (dir: string) => Promise<void>) {
  const dir = await Deno.makeTempDir();
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("extractPdfTextCached: extracts, caches, then serves from cache", async () => {
  await withTmp(async (dir) => {
    const pdf = join(dir, "a b.pdf");
    const cache = join(dir, "cache");
    await Deno.writeFile(pdf, tinyPdf("Hello"));

    const first = await extractPdfTextCached(pdf, cache);
    assertEquals(first.pageCount, 1);
    assertEquals(first.pages[0].includes("Hello"), true);

    // Tamper with the entry: a hit must return the cached pages untouched.
    const file = join(cache, encodeURIComponent("a b.pdf") + ".json");
    const entry = JSON.parse(await Deno.readTextFile(file));
    entry.pages = ["from cache"];
    await Deno.writeTextFile(file, JSON.stringify(entry));
    const second = await extractPdfTextCached(pdf, cache);
    assertEquals(second.pages, ["from cache"]);
    assertEquals(second.text, "from cache");
  });
});

Deno.test("extractPdfTextCached: changed file is re-extracted", async () => {
  await withTmp(async (dir) => {
    const pdf = join(dir, "a.pdf");
    const cache = join(dir, "cache");
    await Deno.writeFile(pdf, tinyPdf("First"));
    await extractPdfTextCached(pdf, cache);

    await Deno.writeFile(pdf, tinyPdf("Second one"));
    const again = await extractPdfTextCached(pdf, cache);
    assertEquals(again.pages[0].includes("Second"), true);
  });
});

Deno.test("extractPdfTextCached: same size, new mtime is re-extracted", async () => {
  await withTmp(async (dir) => {
    const pdf = join(dir, "a.pdf");
    const cache = join(dir, "cache");
    await Deno.writeFile(pdf, tinyPdf("Alpha"));
    await extractPdfTextCached(pdf, cache);

    await Deno.writeFile(pdf, tinyPdf("Omega")); // same length
    await Deno.utime(pdf, new Date(), new Date(Date.now() + 5000));
    const again = await extractPdfTextCached(pdf, cache);
    assertEquals(again.pages[0].includes("Omega"), true);
  });
});

Deno.test("extractPdfTextCached: corrupt entry is ignored and rewritten", async () => {
  await withTmp(async (dir) => {
    const pdf = join(dir, "a.pdf");
    const cache = join(dir, "cache");
    await Deno.writeFile(pdf, tinyPdf("Hello"));
    await extractPdfTextCached(pdf, cache);
    const file = join(cache, "a.pdf.json");
    await Deno.writeTextFile(file, "{not json");

    const result = await extractPdfTextCached(pdf, cache);
    assertEquals(result.pages[0].includes("Hello"), true);
    assertNotEquals(await Deno.readTextFile(file), "{not json");
  });
});

Deno.test("extractPdfTextCached: unwritable cache dir still returns the text", async () => {
  await withTmp(async (dir) => {
    const pdf = join(dir, "a.pdf");
    await Deno.writeFile(pdf, tinyPdf("Hello"));
    const blocker = join(dir, "blocker");
    await Deno.writeTextFile(blocker, "a file, not a directory");

    const result = await extractPdfTextCached(pdf, join(blocker, "cache"));
    assertEquals(result.pages[0].includes("Hello"), true);
  });
});

Deno.test("pruneCache: removes entries for PDFs that are gone", async () => {
  await withTmp(async (dir) => {
    const cache = join(dir, "cache");
    await Deno.mkdir(cache);
    await Deno.writeTextFile(join(cache, "keep.pdf.json"), "{}");
    await Deno.writeTextFile(join(cache, "gone.pdf.json"), "{}");

    await pruneCache(cache, ["keep.pdf"]);
    const names = [...Deno.readDirSync(cache)].map((e) => e.name);
    assertEquals(names, ["keep.pdf.json"]);
  });
});
