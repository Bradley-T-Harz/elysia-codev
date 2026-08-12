# Elysia Codev Architecture

Elysia Codev is the VS Code interface for Elysia's core coding spine.

## Layers

- `src/extension.ts`: activation and VS Code event wiring.
- `src/ElysiaSidebarProvider.ts`: extension-host state coordinator.
- `src/ElysiaApiClient.ts`: loopback-only client for Elysia coding endpoints.
- `webview/`: React UI for sessions, chat, workspace status, previews, and approvals.

The webview does not call Elysia directly. Requests flow through the extension host. ArchiveForge follows the same split: the selected-file panel renders compact archive truth and selected-member controls, the extension host requests exact approval, and Elysia core alone inspects or writes a disposable sandbox.
