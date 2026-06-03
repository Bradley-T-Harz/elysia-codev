# Command Safety

Codev does not run commands. Future command execution belongs in Elysia core, behind:

- exact command allowlists
- approved workspace/cwd
- explicit operator approval
- timeout
- bounded output
- audit ledger
- cancel support

The extension may display command plans and results, but it must not become an unrestricted command runner.
