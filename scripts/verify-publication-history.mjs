import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scopeIndex = process.argv.indexOf("--scope");
const scope = scopeIndex >= 0 ? process.argv[scopeIndex + 1] : "all";
if (!["tree", "history", "all"].includes(scope)) {
  console.error("Invalid --scope; expected tree, history, or all.");
  process.exit(2);
}

function git(args, input) {
  const result = spawnSync("git", args, {
    cwd: root,
    input,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error("Git publication-history inspection failed closed.");
  }
  return result.stdout;
}

const markers = [
  ["Brad", "ley"].join(""),
  ["Har", "z"].join(""),
  ["ojiji", "-chhaya"].join(""),
  ["Custos", "Naturae"].join(""),
  ["MAIN", "_Projects"].join(""),
];
const privateMarkerFile = process.env.ELYSIA_PUBLICATION_PRIVATE_MARKERS_FILE;
if (privateMarkerFile) {
  for (const line of readFileSync(privateMarkerFile, "utf8").split(/\r?\n/u)) {
    const marker = line.trim();
    if (marker && !markers.includes(marker)) markers.push(marker);
  }
}

const findings = [];
const machinePatterns = [
  /(^|[^A-Za-z0-9_-])\/home\/[A-Za-z0-9._-]+\//u,
  /(^|[^A-Za-z0-9_-])\/Users\/[A-Za-z0-9._-]+\//u,
  /(^|[^A-Za-z0-9_-])[A-Za-z]:\\Users\\[^\\]+\\/u,
];
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/u,
  /gh[pousr]_[A-Za-z0-9_]{20,}/u,
  /sk-[A-Za-z0-9]{24,}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

function deniedPath(relative) {
  const normalized = relative.replaceAll("\\", "/").toLowerCase();
  return (
    /(^|\/)\.env($|\.)/u.test(normalized) ||
    /\.(?:db|sqlite|sqlite3|pem|key|p12|pfx|log)$/u.test(normalized) ||
    normalized.includes("/node_modules/")
  );
}

function fixture(relative) {
  return relative.startsWith("tests/") || relative === "scripts/verify-publication-history.mjs";
}

function inspectText(text, relative, findingScope, object) {
  if (markers.some((marker) => text.includes(marker))) {
    findings.push({ scope: findingScope, category: "private_marker", object, path: relative });
  }
  if (!fixture(relative) && machinePatterns.some((pattern) => pattern.test(text))) {
    findings.push({ scope: findingScope, category: "absolute_machine_path", object, path: relative });
  }
  if (!fixture(relative) && secretPatterns.some((pattern) => pattern.test(text))) {
    findings.push({ scope: findingScope, category: "credential_signature", object, path: relative });
  }
}

function privateAuthorEmail(email) {
  const lowered = email.toLowerCase();
  if (lowered.endsWith("@users.noreply.github.com")) return false;
  return lowered.endsWith(".edu") || markers.some((marker) => lowered.includes(marker.toLowerCase()));
}

if (scope === "tree" || scope === "all") {
  const files = git(["ls-files", "-z"]).toString("utf8").split("\0").filter(Boolean);
  for (const relative of files) {
    if (deniedPath(relative)) findings.push({ scope: "tree", category: "denied_path", path: relative });
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) continue;
    const bytes = readFileSync(absolute);
    if (bytes.subarray(0, 8192).includes(0)) continue;
    inspectText(bytes.toString("utf8"), relative, "tree");
  }
}

if (scope === "history" || scope === "all") {
  const commits = git(["rev-list", "--all"]).toString("ascii").trim().split(/\s+/u).filter(Boolean);
  const paths = git(["log", "--all", "--name-only", "--format="])
    .toString("utf8")
    .split(/\r?\n/u)
    .filter(Boolean);
  for (const relative of new Set(paths)) {
    if (deniedPath(relative)) findings.push({ scope: "history", category: "denied_path", path: relative });
  }
  for (const marker of markers) {
    const result = spawnSync("git", ["grep", "-Il", "-e", marker, ...commits, "--"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      shell: false,
    });
    if (![0, 1].includes(result.status)) throw new Error("Git history marker scan failed closed.");
    for (const hit of result.stdout.split(/\r?\n/u).filter(Boolean)) {
      const separator = hit.indexOf(":");
      findings.push({
        scope: "history",
        category: "private_marker",
        object: hit.slice(0, separator),
        path: hit.slice(separator + 1),
      });
    }
  }
  const identities = git(["log", "--all", "--format=%H%x00%ae%x00%ce%x00"])
    .toString("utf8")
    .split("\0");
  for (let index = 0; index + 2 < identities.length; index += 3) {
    const [commit, authorEmail, committerEmail] = identities.slice(index, index + 3);
    if ([authorEmail, committerEmail].some((email) => privateAuthorEmail(email))) {
      findings.push({ scope: "history", category: "private_author_email", object: commit.trim() });
    }
  }
  const messages = git(["log", "--all", "--format=%H%x00%B%x00"]).toString("utf8").split("\0");
  for (let index = 0; index + 1 < messages.length; index += 2) {
    if (markers.some((marker) => messages[index + 1].includes(marker))) {
      findings.push({ scope: "history", category: "private_commit_message", object: messages[index] });
    }
  }
}

const unique = Array.from(new Map(findings.map((item) => [JSON.stringify(item), item])).values());
const report = {
  status: unique.length ? "failed" : "passed",
  scope,
  finding_count: unique.length,
  findings: unique.slice(0, 200),
  content_printed: false,
};
const rendered = `${JSON.stringify(report, null, 2)}\n`;
const reportIndex = process.argv.indexOf("--report");
if (reportIndex >= 0) writeFileSync(process.argv[reportIndex + 1], rendered, "utf8");
process.stdout.write(rendered);
process.exit(unique.length ? 1 : 0);
