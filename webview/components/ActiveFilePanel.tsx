import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  activeFile: WebviewState["activeFile"];
  filePreview: WebviewState["coding"]["filePreview"];
  busyAction: WebviewState["coding"]["busyAction"];
  canReadWorkspace: boolean;
  onReadPreview: () => void;
};

export default function ActiveFilePanel({ activeFile, filePreview, busyAction, canReadWorkspace, onReadPreview }: Props) {
  const busy = busyAction === "filePreview";
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Active File</span>
        <span className="pill">{activeFile?.scheme ?? "none"}</span>
      </div>
      {activeFile ? (
        <dl className="facts facts--single">
          <div><dt>Name</dt><dd>{activeFile.fileName}</dd></div>
          <div><dt>Path</dt><dd>{activeFile.relativePath}</dd></div>
          <div><dt>Language</dt><dd>{activeFile.languageId}</dd></div>
          <div><dt>Dirty</dt><dd>{activeFile.isDirty ? "yes" : "no"}</dd></div>
        </dl>
      ) : (
        <p className="muted">Open a file-backed editor to request an approved bounded preview.</p>
      )}
      <button className="ghost" disabled={busy || !activeFile || !canReadWorkspace} onClick={onReadPreview}>
        {busy ? "Reading preview..." : "Read approved preview"}
      </button>
      {filePreview ? (
        <div className="file-preview">
          <p className="muted">
            {filePreview.status} · {filePreview.relative_path ?? filePreview.file_label} · hash {filePreview.path_hash}
          </p>
          <p className="muted">
            Source included: {filePreview.source_contents_included ? "yes" : "no"} · {filePreview.lines_returned} lines · {filePreview.bytes_returned} bytes
            {filePreview.truncated ? " · truncated" : ""}
          </p>
          {filePreview.blocked_reason ? <p className="error-note">Blocked: {filePreview.blocked_reason}</p> : null}
          {filePreview.warnings.length ? <p className="muted">Warnings: {filePreview.warnings.join(", ")}</p> : null}
          {filePreview.content_preview ? <pre className="source-preview">{filePreview.content_preview}</pre> : null}
        </div>
      ) : null}
    </section>
  );
}
