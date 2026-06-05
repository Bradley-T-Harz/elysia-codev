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

## Reporting Security Issues

Report suspected leaks, unsafe authority expansion, or broken approval boundaries before using Codev on private repositories.
