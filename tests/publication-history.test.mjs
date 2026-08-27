import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("current Codev tree passes the publication-history privacy gate", () => {
  const completed = spawnSync("node", ["scripts/verify-publication-history.mjs", "--scope", "tree"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(completed.status, 0, `${completed.stdout}\n${completed.stderr}`);
});

test("Codev publication contract keeps private repos and product features protected", () => {
  const contract = readFileSync(path.join(root, "docs/publication-boundary.md"), "utf8");
  assert.match(contract, /approved public Add-on/u);
  assert.match(contract, /Website, Artisan, and company repositories remain private/u);
  assert.match(contract, /repair, harden, and test/u);
  assert.match(contract, /does not authorize publication/u);
});

test("history verifier recognizes the approved GitHub noreply metadata boundary", () => {
  const verifier = readFileSync(path.join(root, "scripts/verify-publication-history.mjs"), "utf8");
  assert.match(verifier, /@users\.noreply\.github\.com/u);
  assert.match(verifier, /privateAuthorEmail/u);
  assert.match(verifier, /canonicalPublicReferences/u);
  assert.match(verifier, /CANONICAL_REPOSITORY/u);
});
