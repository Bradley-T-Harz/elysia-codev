# Elysia Codev Privacy

Elysia Codev is local-first. It stores lightweight UI sessions in VS Code workspace state and talks to the local Elysia API bridge.

It must not send source code, local paths, private files, secrets, workspace content, request traces, memory, identity data, or dependency inventory to Marketplace or cloud services.

Repository preview is metadata-only. Selected file preview is explicit, local,
and governed by Elysia core. File preview metadata may include type, adapter,
hash, encoding, parse summary, capabilities, risks, and redaction notes. Raw
private paths, vault contents, hidden reasoning, and real `.env` contents are
not exposed.
