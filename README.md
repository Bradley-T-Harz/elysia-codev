# Elysia Codev

Elysia Codev is a first-party official Elysia add-on for developers. It provides a local-first coding-room shell inside VS Code while keeping Elysia core clean.

This extension is not Elysia core and does not require Marketplace sign-in. It connects to the local Elysia API bridge on `http://127.0.0.1:8000` by default.

## What Works Now

- Elysia Activity Bar container.
- Coding Room webview shell.
- Local Elysia coding bridge connection status through `/coding/status`.
- Local governed coding session creation through `/coding/session/start`.
- Chat pane wired to `/coding/chat` for safe planning responses.
- Metadata-only workspace preview through `/coding/repo/inspect-preview`.
- Approved selected-file preview through `/coding/file/read-preview`, including
  Elysia core file type, adapter, capability, risk, hash, encoding, parse, and
  redaction truth.
- Science/data stewardship panels for approved data previews, metadata/schema
  summaries, data export plans, and governed mutation plans backed by Elysia
  core `/coding/data/*` endpoints.
- Guarded patch proposal/apply surfaces when Elysia core policy and approval
  mode allow them.
- Exact approved check output surfaces for allowlisted commands only.
- Local UI sessions stored in VS Code state, with backend session IDs when available.
- Workspace/trust status.
- Git and changed-files placeholders.
- Approval mode controls.
- Patch preview placeholder.
- Settings panel.

## Intentionally Disabled

- No silent patch application.
- No arbitrary command or test execution.
- No shell, package manager, Git mutation, or worker execution from Codev.
- No cloud upload.
- No Marketplace account requirement.
- No source-code contents returned by the repo preview or stored by default.
- No secrets, service-role keys, tokens, or local private data storage.

## Local-First Boundary

The extension uses VS Code UI APIs, the extension host, local extension state, and the local Elysia bridge. The webview does not fetch the local API directly. It does not send source code to Marketplace or cloud services. Any future patch or command capability must go through explicit Elysia governance, exact approval, ledger truth, and rollback notes.

## Local Bridge Endpoints

The current MVP uses:

- `GET /coding/status`
- `POST /coding/session/start`
- `POST /coding/chat`
- `POST /coding/repo/inspect-preview`
- `POST /coding/file/read-preview`
- `GET /coding/data-types`
- `POST /coding/data/inspect`
- `POST /coding/data/preview`
- `POST /coding/data/export-plan`
- `POST /coding/data/export-approved`
- `POST /coding/data/mutation-plan`
- `POST /coding/data/apply-mutation-approved`
- `POST /coding/patch/propose`
- `POST /coding/patch/apply-approved`
- `POST /coding/command/run-approved`

These endpoints are local-only and governed. Repo preview returns bounded
metadata and ignores common generated/private paths; selected source preview
requires explicit approval and returns Elysia's file type/risk/capability truth.

## Run in Extension Development Host

```bash
npm install
npm run compile
code <workspace-root>/EcoSyneva_Commons_LLC/<coordination-root>/Add-ons/Official_Addons/elysia-codev
```

Then press `F5` in VS Code and open the **Elysia** Activity Bar icon in the Extension Development Host.

## Package a VSIX

```bash
npm run compile
npm run vscode:package
```

Or:

```bash
./scripts/package-vsix.sh
```

Packaging a local VSIX does not publish the extension. Public VS Code Marketplace publishing is a separate future process.

## Settings

- `elysia.apiUrl`: local API URL. Default `http://127.0.0.1:8000`.
- `elysia.approvalMode`: default approval posture. Default `plan_only`.
- `elysia.allowPatchPreview`: patch preview posture. Apply still requires Elysia
  core approval mode, exact approval, path guard, hash check, and audit.
- `elysia.allowCommandExecution`: exact approved commands only when Elysia core
  policy allows them.
- `elysia.workspaceTrustMode`: how the companion interprets workspace trust.

## Roadmap

1. Richer read-only repo intelligence through local Elysia governance.
2. Patch preview with no apply.
3. Approved VS Code-native patch application.
4. Approved focused test commands with allowlists/timeouts.
5. Marketplace packaging as an official add-on.
