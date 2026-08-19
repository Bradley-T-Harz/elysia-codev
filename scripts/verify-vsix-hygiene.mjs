import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const packagePath = process.argv[2];

if (!packagePath || !existsSync(packagePath)) {
  console.error("Usage: npm run verify:package -- PATH_TO_VSIX");
  process.exit(2);
}

function unzip(args) {
  const result = spawnSync("unzip", args, {
    encoding: null,
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
  });
  if (result.status !== 0) {
    console.error("VSIX inspection failed without extracting the package.");
    process.exit(1);
  }
  return result.stdout;
}

const entries = unzip(["-Z1", packagePath])
  .toString("utf8")
  .split(/\r?\n/u)
  .filter(Boolean);

const forbiddenEntries = entries.filter((entry) => {
  const normalized = entry.replaceAll("\\", "/").toLowerCase();
  return (
    normalized.includes("/node_modules/") ||
    normalized.startsWith("extension/src/") ||
    normalized.startsWith("extension/tests/") ||
    (normalized.startsWith("extension/webview/") && normalized !== "extension/webview/styles.css") ||
    normalized.startsWith("extension/scripts/") ||
    normalized.endsWith(".map") ||
    normalized.endsWith(".ts") ||
    normalized.endsWith(".tsx") ||
    /(^|\/)\.env($|\.)/u.test(normalized) ||
    /\.(pem|key|p12|pfx|db|sqlite|log)$/u.test(normalized)
  );
});

const requiredEntries = [
  "extension/package.json",
  "extension/LICENSE.txt",
  "extension/out/src/extension.js",
  "extension/dist/webview.js",
  "extension/webview/styles.css",
];
const missingRequired = requiredEntries.filter((entry) => !entries.includes(entry));

const textEntries = entries.filter(
  (entry) =>
    entry.startsWith("extension/") &&
    /\.(json|js|md|txt|css|svg|xml|html)$/iu.test(entry),
);
const findings = [];
const machinePatterns = [
  /\/home\/[A-Za-z0-9._-]+\//u,
  /\/Users\/[A-Za-z0-9._-]+\//u,
  /[A-Za-z]:\\Users\\[^\\]+\\/u,
];
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/u,
  /gh[pousr]_[A-Za-z0-9_]{20,}/u,
  /sk-[A-Za-z0-9]{24,}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

for (const entry of textEntries) {
  const bytes = unzip(["-p", packagePath, entry]);
  if (bytes.length > 2 * 1024 * 1024) {
    findings.push(`${entry}:text-entry-too-large`);
    continue;
  }
  const text = bytes.toString("utf8");
  if (machinePatterns.some((pattern) => pattern.test(text))) {
    findings.push(`${entry}:machine-path`);
  }
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    findings.push(`${entry}:credential-signature`);
  }
}

if (forbiddenEntries.length || missingRequired.length || findings.length) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        forbidden_entries: forbiddenEntries,
        missing_required: missingRequired,
        content_findings: findings,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "passed",
    package: path.basename(packagePath),
    entry_count: entries.length,
    inspected_text_entries: textEntries.length,
    private_paths_found: 0,
    credential_signatures_found: 0,
  }),
);
