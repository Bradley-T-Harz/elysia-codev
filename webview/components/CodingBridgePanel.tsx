import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  coding: WebviewState["coding"];
  onInspectRepo: () => void;
};

export default function CodingBridgePanel({ coding, onInspectRepo }: Props) {
  const bridge = coding.bridge;
  const preview = coding.repoPreview;

  return (
    <section className="panel">
      <div className="panel-head">
        <span>Coding Bridge</span>
        <span className="pill">{bridge?.contract_version ?? "checking"}</span>
      </div>
      {coding.lastError ? <p className="error-note">{coding.lastError}</p> : null}
      <dl className="facts">
        <div><dt>Local only</dt><dd>{bridge?.boundaries.local_only ? "yes" : "unknown"}</dd></div>
        <div><dt>Marketplace</dt><dd>{bridge?.boundaries.marketplace_account_required ? "required" : "not required"}</dd></div>
        <div><dt>Patch apply</dt><dd>disabled</dd></div>
        <div><dt>Commands</dt><dd>disabled</dd></div>
      </dl>
      {bridge?.disabled_capabilities.length ? (
        <p className="muted">Disabled: {bridge.disabled_capabilities.join(", ")}</p>
      ) : null}
      <button className="ghost" onClick={onInspectRepo}>Inspect workspace preview</button>
      {preview ? (
        <div className="repo-preview">
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
            <p className="muted">Ignored: {preview.ignored_entries.slice(0, 6).join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
