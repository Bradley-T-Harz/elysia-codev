import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  context: WebviewState["ideContext"];
  onChange: (settings: WebviewState["ideContext"]) => void;
};

type BooleanContextKey = "workspaceMetadata" | "activeFileMetadata" | "approvedFilePreview";
const labels: Array<{ key: BooleanContextKey; label: string; note: string }> = [
  { key: "workspaceMetadata", label: "Workspace metadata", note: "Folder label, trust, bounded repo preview metadata." },
  { key: "activeFileMetadata", label: "Active file metadata", note: "File name, language, dirty state, local scheme." },
  { key: "approvedFilePreview", label: "Approved file previews", note: "Only after explicit Read approved preview approval." }
];

export default function IdeContextPanel({ context, onChange }: Props) {
  function toggle(key: BooleanContextKey) {
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
              onChange={() => toggle(item.key)}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="muted">Selected SCM metadata: {context.selectedChangedFiles.length} file(s). File contents are never implied by this selection.</p>
    </section>
  );
}
