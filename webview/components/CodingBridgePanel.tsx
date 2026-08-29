import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  coding: WebviewState["coding"];
  workspace: WebviewState["workspace"];
  onApproveRepo: () => void;
  onRevokeRepo: () => void;
  onInspectRepo: () => void;
  onRefresh: () => void;
};

export default function CodingBridgePanel({ coding, workspace, onApproveRepo, onRevokeRepo, onInspectRepo, onRefresh }: Props) {
  const bridge = coding.bridge;
  const preview = coding.repoPreview;
  const busy = Boolean(coding.busyAction);

  return (
    <section className="panel">
      <div className="panel-head">
        <span>Coding Bridge</span>
        <span className="pill">{bridge?.contract_version ?? "checking"}</span>
      </div>
      {coding.lastError ? <p className="error-note">{coding.lastError}</p> : null}
      {coding.lastAction ? <p className="success-note">{coding.lastAction}</p> : null}
      <dl className="facts">
        <div><dt>Official add-on</dt><dd>{coding.developerProfile?.official_addon ? "yes · v1.0.0 stable" : "unknown"}</dd></div>
        <div><dt>Developer profile</dt><dd>{coding.developerProfile?.profile_readiness ?? "unknown"}</dd></div>
        <div><dt>Codev package</dt><dd>{coding.developerProfile?.codev_install.state ?? "unknown"}</dd></div>
        <div><dt>Repo approval</dt><dd>{coding.repoApproval.status}</dd></div>
        <div><dt>Local only</dt><dd>{bridge?.boundaries.local_only ? "yes" : "unknown"}</dd></div>
        <div><dt>Marketplace</dt><dd>{bridge?.boundaries.marketplace_account_required ? "required" : "not required"}</dd></div>
        <div><dt>Patch apply</dt><dd>{bridge?.boundaries.patch_apply_allowed ? "approval-gated" : "disabled"}</dd></div>
        <div><dt>Commands</dt><dd>{bridge?.boundaries.command_execution_allowed ? "allowlist + approval" : "disabled"}</dd></div>
      </dl>
      {bridge?.disabled_capabilities.length ? (
        <p className="muted">Disabled: {bridge.disabled_capabilities.join(", ")}</p>
      ) : null}
      <details>
        <summary>Governed media worker truth</summary>
        <dl className="facts facts--single">
          <div><dt>SpeechForge STT</dt><dd>{coding.mediaWorkerTruth?.speechforge?.stt_enabled === true ? "local · approval and consent required" : "unavailable"}</dd></div>
          <div><dt>Kokoro TTS</dt><dd>{coding.mediaWorkerTruth?.speechforge?.tts_enabled === true ? "local synthetic reading voices" : "unavailable"}</dd></div>
          <div><dt>ImageForge</dt><dd>{String(coding.mediaWorkerTruth?.imageforge?.state ?? "unknown")} · disabled-by-default lab route · no production-enabled model</dd></div>
          <div><dt>VideoForge</dt><dd>{String(coding.mediaWorkerTruth?.videoforge?.state ?? "unknown")} · {coding.mediaWorkerTruth?.videoforge?.routes_live === true ? "cancellable governed lab route" : "route unavailable"} · {coding.mediaWorkerTruth?.videoforge?.lab_environment_enabled === true ? "lab enabled" : "disabled by default"}</dd></div>
          <div><dt>Voice cloning</dt><dd>unavailable by design · no reference-voice path</dd></div>
        </dl>
        <ul className="muted">
          {[...(coding.mediaWorkerTruth?.imageforge?.models ?? []), ...(coding.mediaWorkerTruth?.videoforge?.models ?? [])].map((model) => (
            <li key={model.id ?? model.display_name}>
              {model.display_name ?? model.id}: {model.gate_status ?? model.enabled_state ?? model.state ?? "unknown"}
              {model.production_blockers?.length ? ` · ${model.production_blockers.join("; ")}` : ""}
            </li>
          ))}
        </ul>
        <p className="muted">Codev displays worker and gate truth. STT/TTS and generative-lab execution remain governed by Elysia core; no production media-generation controls are presented here.</p>
      </details>
      <div className="button-row">
        <button className="ghost" disabled={busy} onClick={onRefresh}>{coding.busyAction === "refresh" ? "Refreshing..." : "Refresh bridge"}</button>
        <button className="ghost" disabled={busy || !workspace.vscodeTrusted || coding.repoApproval.approved} onClick={onApproveRepo}>Approve exact repo</button>
        <button className="ghost" disabled={busy || !coding.repoApproval.approved} onClick={onRevokeRepo}>Revoke repo</button>
        <button className="ghost" disabled={busy || !workspace.canReadWorkspace} onClick={onInspectRepo}>{coding.busyAction === "repoPreview" ? "Inspecting..." : "Inspect repo preview"}</button>
      </div>
      <p className="muted">Repository approval binds to {coding.repoApproval.workspaceLabel}{coding.repoApproval.workspaceRootHash ? ` · ${coding.repoApproval.workspaceRootHash}` : ""}. No raw root, shell, Git mutation, network, push, or publish authority is exposed.</p>
      {preview ? (
        <div className="repo-preview">
          <p className="muted">
            {preview.workspace_label} · root hash {preview.workspace_root_hash}
          </p>
          <p className="muted">
            {preview.entries_returned} metadata entries. Source contents included: {preview.source_contents_included ? "yes" : "no"}.
          </p>
          <ul className="file-list">
            {preview.preview_entries.slice(0, 12).map((entry) => (
              <li key={`${entry.kind}:${entry.relative_path}`}>
                <span>{entry.relative_path}</span>
                <small>{entry.kind} · depth {entry.depth}</small>
              </li>
            ))}
          </ul>
          {preview.ignored_entries.length ? (
            <p className="muted">Ignored: {preview.ignored_entries.slice(0, 8).join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
