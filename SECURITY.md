# Elysia Codev Security

Elysia Codev is a VS Code doorway into Elysia core. It is not the coding brain and must not gain uncontrolled authority.

## Current Boundary

- Local Elysia API only, loopback by default.
- No cloud upload.
- No Marketplace account requirement.
- No shell, subprocess, git mutation, package-manager execution, or autonomous loop in the extension.
- No source-code contents are read by the extension unless a future Elysia core approval flow explicitly allows it.

## Reporting Security Issues

Report suspected leaks, unsafe authority expansion, or broken approval boundaries before using Codev on private repositories.
