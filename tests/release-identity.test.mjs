import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Codev immutable release identity is qualified without embedding mutable publication state", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(root, "compatibility-manifest.json"), "utf8"),
  );

  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.release_channel, "stable");
  assert.equal(manifest.qualification_state, "pass_10d_vi_qualified");
  assert.equal(manifest.artifact_role, "official_v1_release_payload");
  assert.equal(manifest.distribution.public_distribution_supported, true);
  assert.equal(
    manifest.distribution.canonical_marketplace_url,
    "https://elysiaecobotics.com/marketplace/browse",
  );
  assert.equal(
    manifest.distribution.live_availability_source,
    "canonical_external_release_surfaces",
  );
  assert.equal(manifest.distribution.in_app_marketplace_install_control, false);
  assert.equal(manifest.distribution.microsoft_vscode_marketplace_published, false);
  assert.equal(manifest.distribution.marketplace_account_required, false);
  assert.equal("publication_authorized" in manifest, false);
  assert.equal("public_marketplace_install_available" in manifest, false);
});
