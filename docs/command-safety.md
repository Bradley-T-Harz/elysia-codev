# Command Safety

Codev never accepts arbitrary commands and never starts processes itself. Elysia core currently exposes one fixed, read-only `git diff --check` catalog entry behind:

- exact command allowlists
- approved workspace/cwd
- explicit operator approval
- timeout
- bounded output
- audit ledger
- cancel support
- `shell=false`, closed stdin, sanitized environment, and network/package/Git-mutation denial

The extension displays Elysia's authoritative catalog, exact argv, cwd label, timing, exit code, sanitized bounded output, and request/operation/approval receipts. npm, Cargo, and other ambient build-script entries remain disabled until a local isolated worker can prove reviewed state and resource/network boundaries. The extension must not become a terminal or unrestricted command runner.
