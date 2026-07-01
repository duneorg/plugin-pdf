# Changelog

## [0.3.5] — 2026-07-01

### Fixed

- Added JSDoc to all properties of the internal `FreshCtx` and `DunePluginLike` interfaces — they surface through the `pdfPlugin` return type in deno doc, requiring documentation for a full JSR score.

## [0.3.3] — 2026-07-01

### Fixed

- Minor formatting cleanup in `client.tsx`.

## [0.3.4] — 2026-07-01

### Fixed

- Replaced `any` in internal `DunePluginLike` interface with a typed `FreshCtx` stub — fixes `deno lint` and JSR score.
