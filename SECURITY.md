# Elysia Codev Security

Elysia Codev is a VS Code doorway into Elysia core. It is not the coding brain and must not gain uncontrolled authority.

## Current Boundary

- Local Elysia API only, loopback by default.
- No cloud upload.
- No Marketplace account requirement.
- No shell, subprocess, git mutation, package-manager execution, or autonomous loop in the extension.
- Source-code previews require explicit Elysia core approval and return file
  type, adapter, risk, capability, hash, parse, and redaction truth.
- Codev does not decide file safety itself. Elysia core classifies files,
  blocks secrets/private/runtime paths, scans previews, validates patchability,
  and audits approved mutations.
- Codev never parses or extracts archives itself. Elysia core owns archive classification, hostile-member detection, limits, exact plans, one-time approvals, and disposable sandbox writes. The UI has no archive install/run/trust/open/extract-all/project-merge controls.
- Full archive member manifests, package metadata dumps, archive bytes, extracted content, passwords, absolute paths, and worker logs do not belong in Codev audit/trace surfaces.

## Reporting Security Issues

Report suspected leaks, unsafe authority expansion, or broken approval boundaries before using Codev on private repositories.
