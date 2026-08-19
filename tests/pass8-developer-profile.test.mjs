import assert from "node:assert/strict";
import { chmodSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import credentialModule from "../out/src/LocalCredentialProvider.js";
import diffModule from "../out/src/unifiedDiffPreview.js";

const { LocalCredentialProvider, resolveLocalCredentialPath } = credentialModule;
const { applyUnifiedDiffPreview } = diffModule;

function source(path) {
  return BunlessRead(path);
}

function BunlessRead(path) {
  return requireFile(new URL(`../${path}`, import.meta.url));
}

import { readFileSync } from "node:fs";
function requireFile(url) { return readFileSync(url, "utf8"); }

test("private XDG credential path is deterministic and never exposed by public status", () => {
  const root = join(tmpdir(), `codev-credential-${process.pid}-${Date.now()}`);
  const runtime = join(root, "runtime");
  const credentialPath = resolveLocalCredentialPath({ XDG_RUNTIME_DIR: runtime }, root);
  mkdirSync(join(runtime, "elysia", "auth"), { recursive: true });
  writeFileSync(credentialPath, "x".repeat(48), { mode: 0o600 });
  chmodSync(credentialPath, 0o600);
  const priorRuntime = process.env.XDG_RUNTIME_DIR;
  process.env.XDG_RUNTIME_DIR = runtime;
  try {
    const provider = new LocalCredentialProvider();
    assert.equal(provider.read().status, "available");
    assert.deepEqual(provider.publicStatus(), { status: "available", storageLabel: "XDG private runtime credential" });
    assert.equal(JSON.stringify(provider.publicStatus()).includes("x".repeat(10)), false);
    chmodSync(credentialPath, 0o644);
    assert.equal(provider.read().status, "unsafe_permissions");
    rmSync(credentialPath);
    const target = join(root, "credential-target");
    writeFileSync(target, "y".repeat(48), { mode: 0o600 });
    symlinkSync(target, credentialPath);
    assert.equal(provider.read().status, "invalid");
  } finally {
    priorRuntime === undefined ? delete process.env.XDG_RUNTIME_DIR : process.env.XDG_RUNTIME_DIR = priorRuntime;
    rmSync(root, { recursive: true, force: true });
  }
});

test("native diff preview applies an exact unified diff and rejects stale context", () => {
  const diff = "--- a/demo.txt\n+++ b/demo.txt\n@@ -1,2 +1,2 @@\n alpha\n-beta\n+gamma\n";
  assert.equal(applyUnifiedDiffPreview("alpha\nbeta\n", diff), "alpha\ngamma\n");
  assert.throws(() => applyUnifiedDiffPreview("alpha\nstale\n", diff), /does not match/);
});

test("Codev routes authority through local auth, exact repo approval, fixed Git truth, and bounded task contracts", () => {
  const client = source("src/ElysiaApiClient.ts");
  const provider = source("src/ElysiaSidebarProvider.ts");
  const trust = source("src/WorkspaceTrust.ts");
  assert.match(client, /Authorization = `Bearer \$\{credential\.credential\}`/);
  assert.match(client, /\/coding\/repo\/approval-plan/);
  assert.match(client, /\/coding\/git\/preview/);
  assert.match(client, /\/coding\/command\/catalog/);
  assert.match(client, /\/coding\/task\/next/);
  assert.match(trust, /repoApproval\.approved/);
  assert.match(provider, /Run exactly one receipt-only Developer Lab checkpoint/);
  assert.match(provider, /uri\.scheme === "file"/);
  assert.doesNotMatch(provider, /exec\(|spawn\(|child_process/);
});

test("webview shows real SCM, native review, bounded catalog, and no arbitrary command input", () => {
  const changed = source("webview/components/ChangedFilesPanel.tsx");
  const review = source("webview/components/ReviewWorkflowPanel.tsx");
  const checks = source("webview/components/TestOutputPanel.tsx");
  const settings = source("webview/components/SettingsPanel.tsx");
  assert.match(changed, /Real read-only Git state/);
  assert.match(review, /Open native diff/);
  assert.match(checks, /catalog\?\.entries/);
  assert.doesNotMatch(checks, /placeholder=.*command|type="text"/);
  assert.doesNotMatch(settings, /workspace\.workspaceRoot\b/);
  assert.match(settings, /workspaceRootHash/);
});

test("release webview exposes no active placeholder or future-authority controls", () => {
  const app = source("webview/App.tsx");
  const workMode = source("webview/components/WorkModePanel.tsx");
  const context = source("webview/components/IdeContextPanel.tsx");
  const goal = source("webview/components/GoalWorkflowPanel.tsx");
  const provider = source("src/ElysiaSidebarProvider.ts");
  const rendered = [app, workMode, context, goal, provider].join("\n");
  assert.doesNotMatch(rendered, /coming soon|Connect Developer Forge|Send selected context to Forge|Diagnostics summary|Full Operator unavailable/i);
  assert.doesNotMatch(rendered, /connectDeveloperForgePlaceholder|requestFullOperatorModePlaceholder/);
  assert.match(workMode, /External context transfer/);
  assert.match(workMode, /disabled/);
});

test("VSIX packaging keeps the release webview stylesheet", () => {
  const ignore = source(".vscodeignore");
  const verifier = source("scripts/verify-vsix-hygiene.mjs");
  assert.match(ignore, /!webview\/styles\.css/);
  assert.match(verifier, /extension\/webview\/styles\.css/);
  assert.match(verifier, /extension\/dist\/webview\.js/);
});
