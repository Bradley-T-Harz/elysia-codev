import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  coding: WebviewState["coding"];
  workspace: WebviewState["workspace"];
  onInspectRepo: () => void;
  onRefresh: () => void;
};

export default function CodingBridgePanel({ coding, workspace, onInspectRepo, onRefresh }: Props) {
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
        <div><dt>Local only</dt><dd>{bridge?.boundaries.local_only ? "yes" : "unknown"}</dd></div>
        <div><dt>Marketplace</dt><dd>{bridge?.boundaries.marketplace_account_required ? "required" : "not required"}</dd></div>
        <div><dt>Patch apply</dt><dd>{bridge?.boundaries.patch_apply_allowed ? "approval-gated" : "disabled"}</dd></div>
        <div><dt>Commands</dt><dd>{bridge?.boundaries.command_execution_allowed ? "allowlist + approval" : "disabled"}</dd></div>
      </dl>
      {bridge?.disabled_capabilities.length ? (
        <p className="muted">Disabled: {bridge.disabled_capabilities.join(", ")}</p>
      ) : null}
      <div className="button-row">
        <button className="ghost" disabled={busy} onClick={onRefresh}>{coding.busyAction === "refresh" ? "Refreshing..." : "Refresh bridge"}</button>
        <button className="ghost" disabled={busy || !workspace.canReadWorkspace} onClick={onInspectRepo}>{coding.busyAction === "repoPreview" ? "Inspecting..." : "Inspect repo preview"}</button>
      </div>
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
