# @dune/pdf-archive

PDF serving and text extraction for [Dune CMS](https://getdune.com) sites.

- **`createPdfHandler`** — a secure Fresh-compatible route handler that serves PDF files from a directory
- **`extractPdfText`** — plain text extraction from PDFs for search indexing and AI pipelines

## Installation

Requires Deno and `@dune/core`.

Add the import to your site's `deno.json`:

```json
{
  "imports": {
    "@dune/pdf-archive": "jsr:@dune/pdf-archive",
    "@dune/pdf-archive/handler": "jsr:@dune/pdf-archive/handler",
    "@dune/pdf-archive/extract": "jsr:@dune/pdf-archive/extract"
  }
}
```

## Serving PDFs

Create a route file at `routes/pdf/[filename].ts`:

```ts
import { createPdfHandler } from "@dune/pdf-archive/handler";
import { join } from "@std/path";

export const handler = {
  GET: createPdfHandler({ dir: join(Deno.cwd(), "static", "pdfs") }),
};
```

The handler:

- Rejects path traversal (`..`, `/` in filename)
- Only serves `.pdf` files — all other requests get a 400
- Returns `Content-Type: application/pdf` with `Content-Disposition: inline`
- Sets `Cache-Control: public, max-age=86400` by default (configurable)

### Options

```ts
createPdfHandler({
  dir: "/absolute/path/to/pdfs",   // required
  cacheControl: "public, max-age=3600",  // optional, default: "public, max-age=86400"
})
```

## Extracting text

```ts
import { extractPdfText } from "@dune/pdf-archive/extract";

const result = await extractPdfText("/path/to/document.pdf");

console.log(result.pageCount);  // number of pages
console.log(result.pages);      // string[] — one entry per page
console.log(result.text);       // all pages joined by "\n\n"
```

Uses [unpdf](https://github.com/unjs/unpdf) (PDF.js) for extraction. Returns concatenated plain text — no layout analysis. For publication-specific structured extraction (column detection, footnotes, etc.), build on top of `unpdf` directly.

### Search indexing

To feed PDF text into Dune's search index, run extraction in a build script and write the result as a content file, or integrate via a plugin hook:

```ts
import { extractPdfText } from "@dune/pdf-archive/extract";

const { text } = await extractPdfText("static/pdfs/issue-42.pdf");

await Deno.writeTextFile("content/issues/issue-42.md", `---
title: Issue 42
template: issue
---

${text}
`);
```

## License

MIT
