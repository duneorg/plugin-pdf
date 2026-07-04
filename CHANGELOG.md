# Changelog

## [1.0.0] — 2026-07-05

First stable release. No breaking changes from 0.3.5 — the major bump marks
the package's public API as stable going forward, per semver.

### Fixed

- **JSR doc-coverage score was still 55% despite the 0.3.4/0.3.5 fixes.**
  Those fixes addressed docs on internal interfaces; the larger cause was
  that `deno_doc` resolves a re-exported symbol as an unresolved reference
  carrying no JSDoc whenever its origin file is itself a separate
  `deno.json` entrypoint — even when the origin declaration is fully
  documented. Moving each re-export's doc comment to sit directly before the
  specifier name, inside the export braces, fixes this; all 6 entrypoints
  are now at 100% documented symbols.

## [0.3.5] — 2026-07-01

### Fixed

- Added JSDoc to all properties of the internal `FreshCtx` and `DunePluginLike` interfaces — they surface through the `pdfPlugin` return type in deno doc, requiring documentation for a full JSR score.

## [0.3.3] — 2026-07-01

### Fixed

- Minor formatting cleanup in `client.tsx`.

## [0.3.4] — 2026-07-01

### Fixed

- Replaced `any` in internal `DunePluginLike` interface with a typed `FreshCtx` stub — fixes `deno lint` and JSR score.
