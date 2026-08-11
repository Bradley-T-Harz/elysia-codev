# Elysia Codev

Elysia Codev is a first-party official Elysia add-on for developers. It provides a local-first coding-room shell inside VS Code while keeping Elysia core clean.

This extension is not Elysia core and does not require Marketplace sign-in. It connects to the local Elysia API bridge on `http://127.0.0.1:8000` by default.

## What Works Now

- Elysia Activity Bar container.
- Coding Room webview shell.
- Local Elysia coding bridge connection status through `/coding/status`.
- Local governed coding session creation through `/coding/session/start`.
- Chat pane wired to `/coding/chat` for bounded deterministic planning responses. It is not yet a general coding-reasoning model; the Fibonacci transform is an explicitly contained contract fixture.
- Metadata-only workspace preview through `/coding/repo/inspect-preview`.
- Approved selected-file preview through `/coding/file/read-preview`, including
  Elysia core file type, adapter, capability, risk, hash, encoding, parse, and
  redaction truth.
- Science/data stewardship panels for approved data previews, metadata/schema
  summaries, data export plans, and governed mutation plans backed by Elysia
  core `/coding/data/*` endpoints.
- Guarded patch proposal/apply surfaces when Elysia core policy and approval
  mode allow them.
- Exact approved output for the read-only `git diff --check` lane; workspace-controlled npm/Cargo script buttons stay hidden and policy-disabled pending isolated, state-bound execution.
- Generic text/code create, full-content edit/replace, recoverable delete, and same-type rename/move through Elysia core plan/approval/apply services.
- Document, science/data/geospatial, and image/OCR/SVG panels with adapter-specific capability and dependency truth.
- Read-only WAV/MP3/FLAC/OGG/M4A and MP4/MOV/MKV/WebM metadata panels, with fixed local video thumbnails, privacy/safety flags, dependency truth, and request/operation/audit IDs. Governed local STT and non-cloning Kokoro TTS API flows are available through Elysia core; Codev surfaces their live/disabled truth without adding unreviewed action controls.
- Sanitized coding audit records with request, operation, approval, relative-path, hash, mutation, shell, backup, and persistence truth.
- Local UI sessions stored in VS Code state, with backend session IDs when available.
- Workspace/trust status.
- Read-only Git and changed-file status surfaces.
- Approval mode controls.
- Live patch proposal/review/apply surface with exact source and patch hashes.
- Settings panel.

## Intentionally Disabled

- No silent patch application.
- No arbitrary command or test execution.
- No shell, package manager mutation, Git mutation, or arbitrary worker execution from Codev. The read-only diff check uses exact direct argv with `shell=false`; npm/Cargo scripts and build hooks are not executable through Codev.
- No cloud upload.
- No Marketplace account requirement.
- No source-code contents returned by the repo preview or stored by default.
- Voice cloning/reference-voice input, transcoding, and media mutation are unavailable. ImageForge remains disabled-by-default lab-only and VideoForge remains smoke/contract-only with no live generation route.
- No secrets, service-role keys, tokens, or local private data storage.

## Local-First Boundary

The extension uses VS Code UI APIs, the extension host, local extension state, and the local Elysia bridge. The webview does not fetch the local API directly. It does not send source code to Marketplace or cloud services. Patch, file, document, data, visual, and command capabilities go through Elysia core planning, exact expiring one-time approval, source/plan hash checks, audit/trace truth, and backup or derived-output rules.

## Local Bridge Endpoints

The current MVP uses:

- `GET /coding/status`
- `POST /coding/session/start`
- `POST /coding/chat`
- `POST /coding/repo/inspect-preview`
- `POST /coding/file/read-preview`
- `POST /coding/file/operation-plan`
- `POST /coding/file/operation-execute-approved`
- `POST /coding/operation/approve`
- `GET /coding/operation/audit`
- `POST /coding/document/*`
- `GET /coding/data-types`
- `POST /coding/data/inspect`
- `POST /coding/data/preview`
- `POST /coding/data/export-plan`
- `POST /coding/data/export-approved`
- `POST /coding/data/mutation-plan`
- `POST /coding/data/apply-mutation-approved`
- `GET /coding/media-types`
- `POST /coding/media/inspect`
- `POST /coding/media/thumbnail`
- `POST /coding/patch/propose`
- `POST /coding/patch/apply-approved`
- `POST /coding/command/plan`
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
- `elysia.workspaceTrustMode`: how the companion interprets workspace trust.

## Next proof / roadmap

1. Run Extension Host proof for restart/reload, preview, exact patch apply, exact checks, generic CRUD, document/data/visual flows, and audit visibility against disposable workspaces.
2. Replace the bounded deterministic chat bridge with a real governed general local coding reasoner and reviewed patch-generation path.
3. Add automated extension-host/API client coverage without weakening current approval boundaries.
4. Marketplace packaging remains a separate official add-on release task.
