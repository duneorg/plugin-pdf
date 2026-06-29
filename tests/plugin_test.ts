/**
 * Tests for the plugin factory (the `site.yaml` integration entry point).
 *
 * Extraction itself is covered by extract_test.ts — these tests verify the
 * factory wires routes, client entries, and the search hook correctly.
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1";
import pdfPlugin from "../src/plugin.ts";

Deno.test("plugin: factory returns name, version, and default route", () => {
  const plugin = pdfPlugin();
  assertEquals(plugin.name, "pdf");
  assertExists(plugin.version);
  assertEquals(plugin.publicRoutes?.length, 1);
  assertEquals(plugin.publicRoutes?.[0].path, "/pdf/:filename");
});

Deno.test("plugin: custom route prefix is honored and trailing slash trimmed", () => {
  const plugin = pdfPlugin({ route: "/documents/" });
  assertEquals(plugin.publicRoutes?.[0].path, "/documents/:filename");
});

Deno.test("plugin: exposes the viewer client bundle", () => {
  const plugin = pdfPlugin();
  assertExists(plugin.clientEntries?.viewer);
});

Deno.test("plugin: search hook registered by default, absent when index disabled", () => {
  assertExists(pdfPlugin().hooks.onSearchRecordsCollect);
  assertEquals(pdfPlugin({ index: false }).hooks.onSearchRecordsCollect, undefined);
});

Deno.test("plugin: pluginName tag for loader config lookup", () => {
  assertEquals(pdfPlugin.pluginName, "pdf");
});

Deno.test("plugin: onSearchRecordsCollect pushes nothing when dir is missing", async () => {
  const plugin = pdfPlugin({ dir: "/nonexistent/pdf/dir" });
  const ctx = { data: { records: [] as unknown[] } };
  await plugin.hooks.onSearchRecordsCollect(ctx);
  assertEquals(ctx.data.records.length, 0);
});
