# Elysia Codev Security

Elysia Codev is a VS Code doorway into Elysia core. It is not the coding brain and must not gain uncontrolled authority.

## Current Boundary

- Local Elysia API only, loopback by default.
- Packaged mutation authentication uses a private XDG credential kept out of the webview, UI, errors, and receipts.
- VS Code workspace trust and exact Elysia repository approval are both required for repository access. Approval is revocable and never grants broad roots.
- No cloud upload.
- No Marketplace account requirement.
- No shell, subprocess, git mutation, package-manager execution, or autonomous loop in the extension.
- Real Git truth is fixed-argv and read-only. Native diff review mutates nothing; patch apply remains exact-hash, one-time-approved Elysia authority.
- Developer Lab is limited to plan/approve/manual checkpoint/stop contracts. A checkpoint executes no command, patch, tool, or continuation.
- Source-code previews require explicit Elysia core approval and return file
  type, adapter, risk, capability, hash, parse, and redaction truth.
- Codev does not decide file safety itself. Elysia core classifies files,
  blocks secrets/private/runtime paths, scans previews, validates patchability,
  and audits approved mutations.
- Codev never parses or extracts archives itself. Elysia core owns archive classification, hostile-member detection, limits, exact plans, one-time approvals, and disposable sandbox writes. The UI has no archive install/run/trust/open/extract-all/project-merge controls.
- Full archive member manifests, package metadata dumps, archive bytes, extracted content, passwords, absolute paths, and worker logs do not belong in Codev audit/trace surfaces.

## Reporting Security Issues

Report suspected leaks, unsafe authority expansion, or broken approval boundaries privately through the current security contact at <https://elysiaecobotics.com/.well-known/security.txt> before using Codev on private repositories.

Do not place vulnerability details, local bridge credentials, source code,
private repository information, personal data, signing material, or production
secrets in a public issue. Include the affected Codev and Elysia versions,
bounded reproduction steps, and impact; use synthetic content and remove
absolute paths or identifying details. No response-time or bounty promise is
made here.
