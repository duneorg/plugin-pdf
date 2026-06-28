# @dune/pdf

PDF serving, text extraction, and in-browser viewing for
[Dune CMS](https://getdune.com) sites.

- **`createPdfHandler`** — secure Fresh-compatible route handler that serves PDF
  files from a directory
- **`extractPdfText`** — plain text extraction from PDFs for search indexing and
  AI pipelines
- **`PDFViewer`** — Preact island for rendering PDFs in the browser
  (canvas-based, powered by PDF.js)

## Installation

Requires Deno and `@dune/core`.

Add to your site's `deno.json`:

```json
{
  "imports": {
    "@dune/pdf": "jsr:@dune/pdf",
    "@dune/pdf/handler": "jsr:@dune/pdf/handler",
    "@dune/pdf/extract": "jsr:@dune/pdf/extract",
    "@dune/pdf/viewer": "jsr:@dune/pdf/viewer"
  }
}
```

## Serving PDFs

Create a route file at `routes/pdf/[filename].ts`:

```ts
import { createPdfHandler } from "@dune/pdf/handler";
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
  dir: "/absolute/path/to/pdfs", // required
  cacheControl: "public, max-age=3600", // optional, default: "public, max-age=86400"
});
```

## Extracting text

```ts
import { extractPdfText } from "@dune/pdf/extract";

const result = await extractPdfText("/path/to/document.pdf");

console.log(result.pageCount); // number of pages
console.log(result.pages); // string[] — one entry per page
console.log(result.text); // all pages joined by "\n\n"
```

Uses [unpdf](https://github.com/unjs/unpdf) (PDF.js) for extraction. Returns
concatenated plain text — no layout analysis. For publication-specific
structured extraction (column detection, footnotes, etc.), build on top of
`unpdf` directly.

### Search indexing

To feed PDF text into Dune's search index, run extraction in a build script and
write the result as a content file:

```ts
import { extractPdfText } from "@dune/pdf/extract";

const { text } = await extractPdfText("static/pdfs/issue-42.pdf");

await Deno.writeTextFile(
  "content/issues/issue-42.md",
  `---
title: Issue 42
template: issue
---

${text}
`,
);
```

## PDF viewer

`PDFViewer` is a Preact island that renders a PDF in the browser using PDF.js.
It handles page navigation, keyboard shortcuts, touch swipe, responsive
resizing, print, and download.

### Setup

The viewer reads PDF.js from a global (`window.pdfjsLib`). Download the PDF.js
legacy build from
[github.com/mozilla/pdf.js/releases](https://github.com/mozilla/pdf.js/releases)
and place `pdf.min.js` and `pdf.worker.min.js` in your site's `static/`
directory.

Add the script to your template:

```tsx
<script src="/static/pdf.min.js" />;
```

### Usage

Import `PDFViewer` from `@dune/pdf/viewer` in your theme template:

```tsx
/** @jsxImportSource preact */
import PDFViewer from "@dune/pdf/viewer";

export default function IssueTemplate({ page, site, nav, Layout }: any) {
  const fm = page?.frontmatter ?? {};
  return (
    <Layout site={site} page={page} nav={nav}>
      <article>
        <PDFViewer
          pdfUrl={fm.pdf}
          workerSrc="/static/pdf.worker.min.js"
        />
        <script src="/static/pdf.min.js" />
      </article>
    </Layout>
  );
}
```

### Props

| Prop        | Type              | Default                       | Description                          |
| ----------- | ----------------- | ----------------------------- | ------------------------------------ |
| `pdfUrl`    | `string`          | —                             | URL of the PDF to display            |
| `workerSrc` | `string`          | `"/static/pdf.worker.min.js"` | URL of the PDF.js worker script      |
| `labels`    | `PDFViewerLabels` | English defaults              | Override UI strings for localisation |

### Localisation

```tsx
<PDFViewer
  pdfUrl={fm.pdf}
  labels={{
    firstPage: "Erste Seite",
    prevPage: "Vorherige Seite",
    nextPage: "Nächste Seite",
    lastPage: "Letzte Seite",
    print: "Drucken",
    download: "Herunterladen",
  }}
/>;
```

### Keyboard shortcuts

| Key    | Action        |
| ------ | ------------- |
| `←`    | Previous page |
| `→`    | Next page     |
| `Home` | First page    |
| `End`  | Last page     |

## License

MIT
