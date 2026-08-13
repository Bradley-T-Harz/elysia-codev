import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Codev delegates EngineeringForge inspection and preview to local Elysia routes", () => {
  const client = source("src/ElysiaApiClient.ts");
  assert.match(client, /\/coding\/engineering\/inspect/);
  assert.match(client, /\/coding\/engineering\/preview\/plan/);
  assert.match(client, /\/coding\/engineering\/preview\/apply/);
  assert.doesNotMatch(client, /\/coding\/engineering\/(?:send|machine|print|execute|actuate|controller|robot|upload|overwrite)/);
});

test("EngineeringForge preview uses exact one-time source and plan approval", () => {
  const provider = source("src/ElysiaSidebarProvider.ts");
  assert.match(provider, /operationKind: "engineering_preview"/);
  assert.match(provider, /mutationClass: "engineering_preview_artifact"/);
  assert.match(provider, /sourceHash: plan\.source_sha256/);
  assert.match(provider, /planHash: plan\.plan_hash/);
  assert.match(provider, /expected_source_sha256: plan\.source_sha256/);
  assert.match(provider, /expected_plan_hash: plan\.plan_hash/);
});

test("EngineeringForge panel shows capability truth without physical or execution controls", () => {
  const panel = source("webview/components/EngineeringForgePanel.tsx");
  assert.match(panel, /EngineeringForge/);
  assert.match(panel, /Capability truth/);
  assert.match(panel, /unavailable by design/i);
  assert.match(panel, /source hash/i);
  for (const forbidden of [
    ">Run<",
    ">Execute<",
    ">Machine<",
    ">Print<",
    ">Send<",
    ">Launch ROS<",
    ">Launch Gazebo<",
    ">Upload to Fusion<",
    ">Overwrite original<",
    ">Trust as safe<",
  ]) {
    assert.equal(panel.includes(forbidden), false, `unexpected dangerous control: ${forbidden}`);
  }
});

test("engineering files suppress Codev mutation controls and invalidate on active-file change", () => {
  const activeFile = source("webview/components/ActiveFilePanel.tsx");
  const provider = source("src/ElysiaSidebarProvider.ts");
  assert.match(activeFile, /category === "engineering"/);
  assert.match(activeFile, /engineering files/);
  assert.match(provider, /engineeringOperations\.delete\(activeSessionId\)/);
  assert.match(provider, /preview\.category !== "engineering"/);
});
