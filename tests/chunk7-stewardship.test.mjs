import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Codev delegates Chunk 7 authority to the local Elysia routes", () => {
  const client = source("src/ElysiaApiClient.ts");
  assert.match(client, /\/coding\/database\/types/);
  assert.match(client, /\/coding\/database\/inspect/);
  assert.match(client, /\/coding\/database\/schema\/preview/);
  assert.match(client, /\/coding\/binary\/types/);
  assert.match(client, /\/coding\/binary\/inspect/);
  assert.doesNotMatch(client, /\/coding\/binary\/(execute|patch|load|install)/);
  assert.doesNotMatch(client, /\/coding\/database\/(query|mutate|export)/);
});

test("database schema preview uses the exact one-time approval contract", () => {
  const provider = source("src/ElysiaSidebarProvider.ts");
  assert.match(provider, /operationKind: "database_schema_preview"/);
  assert.match(provider, /mutationClass: "database_schema_preview"/);
  assert.match(provider, /sourceHash: inspection\.source_sha256/);
  assert.match(provider, /planHash: inspection\.schema_preview_plan_hash/);
  assert.match(provider, /No rows, arbitrary SQL, extensions, export, or mutation are allowed/);
});

test("database and binary panels expose truth without dangerous action controls", () => {
  const panel = source("webview/components/DataBinaryForgePanel.tsx");
  assert.match(panel, /Static metadata only/);
  assert.match(panel, /Schema preview requires exact approval/);
  assert.match(panel, /Execution unavailable by design/);
  for (const forbidden of [">Run<", ">Execute<", ">Patch<", ">Install<", ">Load library<", ">Trust this binary<", ">Mutate database<"]) {
    assert.equal(panel.includes(forbidden), false, `unexpected dangerous control: ${forbidden}`);
  }
});
