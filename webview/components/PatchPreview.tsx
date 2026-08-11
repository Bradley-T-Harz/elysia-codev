import * as React from "react";

type Props = {
  preview: { state: string; summary: string; files: string[]; canApply: boolean };
  capabilities: {
    canProposePatch: boolean;
    canApplyPatch: boolean;
  };
  applyResult?: {
    status: string;
    mutation_performed: boolean;
    audit_written: boolean;
    approval_id?: string;
    request_id?: string;
    backup_relative_path?: string;
    rollback_receipt_id?: string;
    blocked_reason?: string;
    rollback_note: string;
    warnings: string[];
  } | null;
  busyAction?: string;
  onApply: () => void;
};
export default function PatchPreview({ preview, capabilities, applyResult, busyAction, onApply }: Props) {
  const detailedPreview = preview as typeof preview & { diffPreview?: string; patchHash?: string; warnings?: string[] };
  const hasDiff = Boolean(detailedPreview.diffPreview);
  const disabledReason = !capabilities.canProposePatch
    ? "Switch to apply with approval or test with approval to request patch proposals."
    : !capabilities.canApplyPatch
      ? "Patch apply is blocked in the current approval mode."
      : !hasDiff
        ? "Ask for a patch after approving a file preview."
        : "";
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Patch Preview</span>
        <span className={capabilities.canApplyPatch ? "pill" : "pill pill--warn"}>{capabilities.canApplyPatch ? "approval apply" : "apply blocked"}</span>
      </div>
      <p>{preview.summary}</p>
      {preview.files.length ? <p className="muted">Files: {preview.files.join(", ")}</p> : null}
      {detailedPreview.patchHash ? <p className="muted">Patch hash: {detailedPreview.patchHash}</p> : null}
      {detailedPreview.warnings?.length ? <p className="muted">Warnings: {detailedPreview.warnings.join(" ")}</p> : null}
      {detailedPreview.diffPreview ? <pre className="source-preview">{detailedPreview.diffPreview}</pre> : null}
      <button className="ghost" disabled={!preview.canApply || busyAction === "applyPatch"} onClick={onApply}>
        {busyAction === "applyPatch" ? "Applying..." : "Approve Apply"}
      </button>
      {disabledReason ? <p className="muted">{disabledReason}</p> : null}
      {applyResult ? (
        <div className={applyResult.mutation_performed ? "success-note" : "error-note"}>
          <strong>{applyResult.status}</strong>
          {applyResult.blocked_reason ? <p>Blocked: {applyResult.blocked_reason}</p> : null}
          <p>Mutation performed: {applyResult.mutation_performed ? "yes" : "no"} · Audit written: {applyResult.audit_written ? "yes" : "no"}</p>
          <p>Request {applyResult.request_id ?? "not returned"} · approval {applyResult.approval_id ?? "not returned"}</p>
          {applyResult.backup_relative_path ? <p>Backup {applyResult.backup_relative_path} · receipt {applyResult.rollback_receipt_id ?? "not returned"}</p> : null}
          <p>{applyResult.rollback_note}</p>
        </div>
      ) : null}
      <p className="muted">
        Patch application requires exact approval, local ledger truth, and rollback notes.
        {applyResult?.mutation_performed ? " This patch was applied after approval." : " No patch has been applied from this proposal yet."}
      </p>
    </section>
  );
}
