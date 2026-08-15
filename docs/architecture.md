# Elysia Codev Architecture

Elysia Codev is the VS Code interface for Elysia's core coding spine.

## Layers

- `src/extension.ts`: activation and VS Code event wiring.
- `src/ElysiaSidebarProvider.ts`: extension-host state coordinator.
- `src/ElysiaApiClient.ts`: loopback-only client for Elysia coding endpoints.
- `src/LocalCredentialProvider.ts`: extension-host-only private XDG credential reader; status but never value crosses into the webview.
- `src/WorkspaceTrust.ts`: combines VS Code trust, configured trust mode, exact Elysia repository approval, and approval posture.
- `src/FileDiffProvider.ts`: real Elysia-provided SCM truth and VS Code native virtual-document diff review.
- `webview/`: React UI for sessions, chat, workspace status, previews, and approvals.

The webview does not call Elysia directly and never receives credentials or raw workspace roots. Requests flow through the extension host. Repository, patch, command, and Developer Lab actions remain Elysia-owned contracts with exact approval and receipts. ArchiveForge follows the same split: the selected-file panel renders compact archive truth and selected-member controls, the extension host requests exact approval, and Elysia core alone inspects or writes a disposable sandbox.
