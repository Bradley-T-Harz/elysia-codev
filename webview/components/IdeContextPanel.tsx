import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  context: WebviewState["ideContext"];
  onChange: (settings: WebviewState["ideContext"]) => void;
};

const labels: Array<{ key: keyof WebviewState["ideContext"]; label: string; note: string; disabled?: boolean }> = [
  { key: "workspaceMetadata", label: "Workspace metadata", note: "Folder label, trust, bounded repo preview metadata." },
  { key: "activeFileMetadata", label: "Active file metadata", note: "File name, language, dirty state, local scheme." },
  { key: "approvedFilePreview", label: "Approved file previews", note: "Only after explicit Read approved preview approval." },
  { key: "diagnosticsSummary", label: "Diagnostics summary", note: "Placeholder until a diagnostics contract exists.", disabled: true }
];

export default function IdeContextPanel({ context, onChange }: Props) {
  function toggle(key: keyof WebviewState["ideContext"]) {
    onChange({ ...context, [key]: !context[key] });
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <span>IDE Context</span>
        <span className="pill">selected only</span>
      </div>
      <p className="muted">Never broad repo ingestion by default. Private, secret, generated, and runtime paths remain blocked by Elysia core.</p>
      <div className="toggle-list">
        {labels.map((item) => (
          <label key={item.key} className="toggle-row">
            <input
              type="checkbox"
              checked={context[item.key]}
              disabled={item.disabled}
              onChange={() => toggle(item.key)}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
