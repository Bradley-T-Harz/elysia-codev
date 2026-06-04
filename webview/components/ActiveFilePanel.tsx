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
  const fileBacked = activeFile?.scheme === "file";
  const previewApproved = filePreview?.status === "completed";
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Active File</span>
        <span className={previewApproved ? "pill" : "pill pill--warn"}>
          {previewApproved ? "preview approved" : activeFile?.scheme ?? "none"}
        </span>
      </div>
      {activeFile ? (
        <dl className="facts facts--single">
          <div><dt>Name</dt><dd>{activeFile.fileName}</dd></div>
          <div><dt>Path</dt><dd>{activeFile.relativePath}</dd></div>
          <div><dt>Language</dt><dd>{activeFile.languageId}</dd></div>
          <div><dt>Dirty</dt><dd>{activeFile.isDirty ? "yes" : "no"}</dd></div>
        </dl>
      ) : (
        <p className="muted">No file-backed editor active. Open a file such as fibonacci_bug.py first.</p>
      )}
      {activeFile && !fileBacked ? (
        <p className="muted">The active tab is not a local file, so Codev cannot request a source preview.</p>
      ) : null}
      <button className="ghost" disabled={busy || !fileBacked || !canReadWorkspace} onClick={onReadPreview}>
        {busy ? "Reading preview..." : "Read approved preview"}
      </button>
      {!canReadWorkspace ? <p className="muted">Workspace read posture is disabled for the current trust/approval mode.</p> : null}
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
