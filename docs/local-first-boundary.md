# Local-First Boundary

Codev is local-first and must default to loopback Elysia only.

Allowed now:

- local bridge status
- session creation
- planning chat
- metadata-only repo preview
- archive type/risk truth through Elysia core
- exact-approved selected archive extraction into an Elysia-owned non-project disposable sandbox
- database identification and static metadata through Elysia core
- exact-approved SQLite/DuckDB schema counts and private artifact receipts from Elysia's read-only snapshot workflow
- bounded static PE/ELF/CLASS/WASM/unknown-BIN metadata and risk summaries through Elysia core

Not allowed in Codev itself:

- cloud upload
- Marketplace account requirement
- direct shell/process execution
- direct file mutation
- direct archive parsing, extraction, install, execution, activation, or project merge
- autonomous workspace scanning
- autonomous archive extraction
- direct database parsing, SQL, row preview, export, extension loading, or mutation
- direct binary parsing, execution, loading, import, install, linking, trust, mutation, patching, or decompilation

Codev remains a client. It cannot convert database schema approval into query/mutation authority or binary static-inspection authority into runtime authority. Detailed schema and binary reports remain local Elysia artifacts; Codev displays receipts, compact counts, risk truth, and sanitized audit IDs.
