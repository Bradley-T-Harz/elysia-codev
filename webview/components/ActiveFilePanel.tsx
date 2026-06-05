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
  const capabilities = filePreview?.capabilities;
  const risks = filePreview?.risk_flags;
  const parseSummary = filePreview?.parse_summary ? JSON.stringify(filePreview.parse_summary, null, 2) : "";
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
          <dl className="facts facts--single">
            <div><dt>Type</dt><dd>{filePreview.file_type_label ?? filePreview.file_type_id ?? "unknown"}</dd></div>
            <div><dt>Category</dt><dd>{filePreview.category ?? "unknown"}</dd></div>
            <div><dt>Adapter</dt><dd>{filePreview.adapter ?? "unknown"}</dd></div>
            <div><dt>Language</dt><dd>{filePreview.language_id ?? filePreview.language_hint ?? "none"}</dd></div>
            <div><dt>Encoding</dt><dd>{filePreview.encoding ?? "unknown"} · {filePreview.line_ending ?? "unknown"} endings</dd></div>
            <div><dt>File size</dt><dd>{filePreview.line_count ?? 0} lines · {filePreview.byte_count ?? 0} bytes</dd></div>
            <div>
              <dt>Capabilities</dt>
              <dd>
                read {capabilities?.readable ? "yes" : "no"} · patch {capabilities?.patchable ? "yes" : "no"} · write {capabilities?.writable ? "yes" : "no"}
              </dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>
                {risks?.secret_sensitive ? "secret-sensitive " : ""}
                {risks?.lockfile ? "lockfile " : ""}
                {risks?.executable_sensitive ? "executable-sensitive " : ""}
                {risks?.generated_sensitive ? "generated-sensitive" : ""}
                {!risks?.secret_sensitive && !risks?.lockfile && !risks?.executable_sensitive && !risks?.generated_sensitive ? "normal" : ""}
              </dd>
            </div>
            <div><dt>Parse</dt><dd>{filePreview.parse_status ?? "not_applicable"}</dd></div>
          </dl>
          <p className="muted">
            Source included: {filePreview.source_contents_included ? "yes" : "no"} · {filePreview.lines_returned} lines · {filePreview.bytes_returned} bytes
            {filePreview.truncated ? " · truncated" : ""}
          </p>
          {filePreview.redactions?.length ? <p className="muted">Redactions: {filePreview.redactions.join(", ")}</p> : null}
          {filePreview.blocked_reason ? <p className="error-note">Blocked: {filePreview.blocked_reason}</p> : null}
          {filePreview.warnings.length ? <p className="muted">Warnings: {filePreview.warnings.join(", ")}</p> : null}
          {parseSummary ? <pre className="source-preview source-preview--compact">{parseSummary}</pre> : null}
          {filePreview.content_preview ? <pre className="source-preview">{filePreview.content_preview}</pre> : null}
        </div>
      ) : null}
    </section>
  );
}
