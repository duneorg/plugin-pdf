# Changelog

## [1.2.1] — 2026-08-24

### Fixed

- **JSR score missing build provenance.** JSR's provenance verification had a
  bug affecting recent Deno versions when 1.2.0 was published; that's now fixed
  upstream. Republished at a new patch version via the existing CI workflow
  (unchanged, already has `id-token: write`) to pick up correct provenance. No
  functional or content changes from 1.2.0.

## [1.2.0] — 2026-07-20

### Added

- **Per-page search indexing.** Each PDF now indexes one search record per
  extracted page instead of one whole-document record — a single query-term hit
  no longer gets diluted across a full document's concatenated text, and results
  link straight to the matching page (`#page={n}`) instead of always page 1.
  Each page record carries `subtype: "pdf"` so PDF content participates in the
  same `type`/subtype facet as other content.
- **`linkRoute` config option.** Decoupled from the raw-file-serving `route`, so
  search-result hrefs can point at a site's own PDF-viewer page (e.g.
  `/issues/{slug}#page=N`) instead of the raw file. Falls back to `route` with a
  `#page=N` anchor when unset.

## [1.1.0] — 2026-07-16

### Added

- **`PDFViewer`'s `extraControls` prop.** Content rendered at the start of each
  control bar (both the top and bottom toolbar), before the page navigation
  controls. Lets consuming themes add site-specific chrome — e.g. links between
  sibling documents — into the same toolbar row instead of a separate bar.
  Backward compatible; omitting the prop changes nothing.

## [1.0.0] — 2026-07-05

First stable release. No breaking changes from 0.3.5 — the major bump marks the
package's public API as stable going forward, per semver.

### Fixed

- **JSR doc-coverage score was still 55% despite the 0.3.4/0.3.5 fixes.** Those
  fixes addressed docs on internal interfaces; the larger cause was that
  `deno_doc` resolves a re-exported symbol as an unresolved reference carrying
  no JSDoc whenever its origin file is itself a separate `deno.json` entrypoint
  — even when the origin declaration is fully documented. Moving each
  re-export's doc comment to sit directly before the specifier name, inside the
  export braces, fixes this; all 6 entrypoints are now at 100% documented
  symbols.

## [0.3.5] — 2026-07-01

### Fixed

- Added JSDoc to all properties of the internal `FreshCtx` and `DunePluginLike`
  interfaces — they surface through the `pdfPlugin` return type in deno doc,
  requiring documentation for a full JSR score.

## [0.3.3] — 2026-07-01

### Fixed

- Minor formatting cleanup in `client.tsx`.

## [0.3.4] — 2026-07-01

### Fixed

- Replaced `any` in internal `DunePluginLike` interface with a typed `FreshCtx`
  stub — fixes `deno lint` and JSR score.
