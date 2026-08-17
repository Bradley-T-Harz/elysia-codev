# Elysia Codev

Elysia Codev is a first-party official Elysia add-on for developers. It provides a local-first coding-room shell inside VS Code while keeping Elysia core clean.

Release status: Developer-profile candidate, version `0.1.0`, channel `v1-finalization`. It is not yet a public Marketplace install claim. The reproducible VSIX boundary is documented in `docs/public-package-hygiene.md`, and final publication remains a Pass 10 decision.

This extension is not Elysia core and does not require Marketplace sign-in. It connects to the authenticated local Elysia API bridge on `http://127.0.0.1:8000` by default. Mutating requests use the private XDG credential inside the extension host; the credential is never sent to the webview or displayed.

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
- ArchiveForge panels for approved local ZIP, TAR, TAR.GZ, 7Z, RAR, WHL, JAR, VSIX, AppImage, and DEB listing/risk truth. ZIP/TAR/TAR.GZ expose selected-file planning and exact-approved extraction into an Elysia-owned disposable sandbox outside the workspace.
- DatabaseForge panels for selected SQLite, DuckDB, and unknown `.db` files. Metadata is static; SQLite/DuckDB schema counts require exact approval and Elysia's private read-only snapshot. Unknown `.db` files remain metadata-only, and rows are never shown.
- BinaryForge panels for bounded static PE/EXE/DLL, ELF/SO/O, Java CLASS, WebAssembly, and unknown BIN metadata, hashes, aggregate import/export/symbol/string counts, structural risk summaries, local artifact receipts, and audit IDs.
- EngineeringForge panels for bounded static STL, OBJ, DAE, STEP/STP, IGES/IGS, DXF, URDF, SDF, G-code, BLEND, F3D, and F3Z reports. STL, OBJ, DXF, and G-code alone expose exact-approved sandbox-only SVG projections; heavy-worker handoff remains disabled when the required namespace sandbox is unavailable.
- Sanitized coding audit records with request, operation, approval, relative-path, hash, mutation, shell, backup, and persistence truth.
- Local UI sessions stored in VS Code state, with backend session IDs when available.
- Real VS Code workspace trust plus exact Elysia repository approval/revocation. A trusted workspace alone grants no repository authority.
- Read-only Git branch, HEAD, remote, dirty/staged/unstaged/untracked counts, and actual SCM changed-file status. No Git mutation is exposed.
- Approval mode controls.
- Live patch proposal, VS Code native diff review, and exact-approved apply with source/patch hashes and receipts.
- Backend-owned bounded command catalog with exact argv/cwd/timeout/output evidence; only catalog entries explicitly enabled by Elysia can run after approval.
- Developer Lab bounded goal plans with a maximum of eight steps and thirty minutes, one explicit receipt-only checkpoint per click, a stop/revoke path, and no background execution.
- Session/context preferences and last receipt identifiers persist in local VS Code state. Credentials and source snapshots do not.
- Truthful Settings panel with Developer profile, authentication, contract, trust, repository hash, and approval status—never a raw repository root.

## Intentionally Disabled

- No silent patch application.
- No arbitrary command or test execution.
- No shell, package manager mutation, Git mutation, or arbitrary worker execution from Codev. The read-only diff check uses exact direct argv with `shell=false`; npm/Cargo scripts and build hooks are not executable through Codev.
- No cloud upload.
- No Marketplace account requirement.
- No source-code contents returned by the repo preview or stored by default.
- Voice cloning/reference-voice input is unavailable by design; transcoding and media mutation are unavailable. ImageForge remains disabled-by-default lab-only. VideoForge exposes a fixed-profile, exact-approved, cancellable Wan lab route through Elysia core, also disabled by default. Neither forge is production-enabled.
- No archive install, execute, import, trust, executable-open, extract-all, project merge, autonomous extraction, or link/device materialization. 7Z is list-only, RAR extraction is license-sensitive lab-only, and WHL/JAR/VSIX/AppImage/DEB are inspect-only.
- No database rows, arbitrary SQL, query/export, attach, extension loading, external access, repair, mutation, or migration. Schema approval cannot authorize any of these.
- No binary execution, loading, importing, installation, linking, trust, mutation, patching, signature tampering, decompilation, or exploit workflow. Deeper disassembly and sandboxed execution remain future separately gated capabilities.
- No engineering source/project mutation, machine send, printing, CNC/serial/controller access, robot actuation, ROS/Gazebo launch, scripts/plugins, conversion/repair apply, cloud/Fusion upload, or safety certification. ParametricForge remains experimental.
- No secrets, service-role keys, tokens, or local private data storage.
- No unbounded goal loop, hidden continuation, broad repository ingestion, arbitrary terminal, commit, push, publish, or cloud upload.

## Local-First Boundary

The extension uses VS Code UI APIs, the extension host, local extension state, and the local Elysia bridge. The webview does not fetch the local API directly. It does not send source code to Marketplace or cloud services. Patch, file, document, data, visual, archive-sandbox, database-schema, engineering-projection, and command capabilities go through Elysia core planning, exact expiring one-time approval, source/plan hash checks, audit/trace truth, and backup, derived-output, private-snapshot, or disposable-sandbox rules.

## Local Bridge Endpoints

The current MVP uses:

- `GET /coding/status`
- `GET /coding/developer-profile`
- `POST /coding/repo/approval-status`
- `POST /coding/repo/approval-plan`
- `POST /coding/repo/approval-apply`
- `POST /coding/repo/revoke`
- `POST /coding/git/preview`
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
- `GET /coding/media/workers`
- `GET /coding/media/gates`
- `POST /coding/media/transcribe/*`
- `POST /coding/media/tts/*`
- `POST /coding/media/imageforge/*` (disabled-by-default lab lane)
- `POST /coding/media/videoforge/*` and `GET /coding/media/videoforge/jobs/*` (disabled-by-default lab lane)
- `GET /coding/archive/types`
- `POST /coding/archive/inspect`
- `POST /coding/archive/extract/plan`
- `POST /coding/archive/extract/apply`
- `GET /coding/archive/jobs/*`
- `GET /coding/archive/artifacts/*`
- `GET /coding/database/types`
- `POST /coding/database/inspect`
- `POST /coding/database/schema/preview`
- `GET /coding/database/artifacts/*`
- `GET /coding/binary/types`
- `POST /coding/binary/inspect`
- `GET /coding/binary/artifacts/*`
- `GET /coding/engineering/types`
- `POST /coding/engineering/inspect`
- `POST /coding/engineering/preview/plan`
- `POST /coding/engineering/preview/apply`
- `GET /coding/engineering/jobs/*`
- `GET /coding/engineering/artifacts/*`
- `POST /coding/patch/propose`
- `POST /coding/patch/apply-approved`
- `POST /coding/command/plan`
- `GET /coding/command/catalog`
- `POST /coding/command/run-approved`
- `POST /coding/task/plan`
- `POST /coding/task/approve`
- `POST /coding/task/next`
- `POST /coding/task/stop`

These endpoints are local-only and governed. Repo preview returns bounded
metadata and ignores common generated/private paths; selected source preview
requires explicit approval and returns Elysia's file type/risk/capability truth.

## Run in Extension Development Host

```bash
npm install
npm run compile
code /path/to/elysia-codev
```

Within the Elysia multi-repository coordination workspace, the canonical
relative checkout location is `Add-ons/Official_Addons/elysia-codev/`. Codev
remains an independent Git repository at that location.

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

The package script uses already installed dependencies and never installs or downloads packages. Packaging a local VSIX does not install or publish the extension. Public VS Code Marketplace publishing is a separate future process.

## Settings

- `elysia.apiUrl`: local API URL. Default `http://127.0.0.1:8000`.
- `elysia.approvalMode`: default approval posture. Default `plan_only`.
- `elysia.workspaceTrustMode`: enforced trust posture: VS Code trust plus exact Elysia approval, forced read-only, or blocked.

## Next proof / roadmap

1. Run Extension Host proof for trusted/untrusted, authenticated/unauthenticated, restart/reload, exact repository approval, native diff, patch apply, bounded checks, Developer Lab stop/revoke, and audit visibility against disposable workspaces.
2. Replace the bounded deterministic chat bridge with a real governed general local coding reasoner and reviewed patch-generation path.
3. Add automated extension-host/API client coverage without weakening current approval boundaries.
4. Marketplace packaging remains a separate official add-on release task.
