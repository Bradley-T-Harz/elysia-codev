import * as React from "react";
import { useEffect, useState } from "react";
import type { WebviewState } from "../types";

type OperationKind = "create" | "edit" | "replace" | "delete" | "rename" | "move";

type Props = {
  activeRelativePath?: string;
  canMutate: boolean;
  busyAction: WebviewState["coding"]["busyAction"];
  operation: WebviewState["coding"]["fileOperation"];
  onPlan: (operationKind: OperationKind, targetPath: string, destinationPath?: string, newText?: string) => void;
  onApply: () => void;
};

export default function FileOperationPanel({ activeRelativePath, canMutate, busyAction, operation, onPlan, onApply }: Props) {
  const [operationKind, setOperationKind] = useState<OperationKind>("edit");
  const [targetPath, setTargetPath] = useState(activeRelativePath ?? "");
  const [destinationPath, setDestinationPath] = useState("");
  const [newText, setNewText] = useState("");
  useEffect(() => {
    if (activeRelativePath) setTargetPath(activeRelativePath);
  }, [activeRelativePath]);

  const needsDestination = operationKind === "rename" || operationKind === "move";
  const needsText = operationKind === "create" || operationKind === "edit" || operationKind === "replace";
  const planReady = operation?.plan?.status === "preview_only" && Boolean(operation.plan.plan_hash);

  return (
    <section className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>Generic governed file operation</strong>
          <p className="muted">Text/code only. Create never overwrites; edit/replace is full-content replacement; delete/rename/move produces a recoverable backup receipt.</p>
        </div>
        <span className={canMutate ? "pill" : "pill pill--warn"}>{canMutate ? "exact approval" : "mutation blocked"}</span>
      </div>
      <select value={operationKind} disabled={!canMutate} onChange={(event) => setOperationKind(event.target.value as OperationKind)}>
        <option value="create">create new text file</option>
        <option value="edit">edit (replace full text)</option>
        <option value="replace">replace full text</option>
        <option value="delete">delete with backup</option>
        <option value="rename">rename same type</option>
        <option value="move">move same type</option>
      </select>
      <input value={targetPath} disabled={!canMutate} onChange={(event) => setTargetPath(event.target.value)} placeholder="workspace-relative target path" />
      {needsDestination ? <input value={destinationPath} disabled={!canMutate} onChange={(event) => setDestinationPath(event.target.value)} placeholder="workspace-relative destination, same governed file type" /> : null}
      {needsText ? <textarea value={newText} disabled={!canMutate} onChange={(event) => setNewText(event.target.value)} placeholder="Exact complete UTF-8 contents to write (secret-scanned before mutation)" rows={8} /> : null}
      <div className="button-row">
        <button className="ghost" disabled={!canMutate || !targetPath.trim() || busyAction === "fileOperationPlan"} onClick={() => onPlan(operationKind, targetPath, destinationPath || undefined, needsText ? newText : undefined)}>
          {busyAction === "fileOperationPlan" ? "Planning..." : "Plan exact operation"}
        </button>
        <button className="ghost" disabled={!canMutate || !planReady || busyAction === "fileOperationApply"} onClick={onApply}>
          {busyAction === "fileOperationApply" ? "Applying..." : "Approve planned operation"}
        </button>
      </div>
      {!canMutate ? <p className="muted">Select apply-with-approval or test-with-approval mode to expose planning and apply controls.</p> : null}
      {operation?.plan ? <pre className="source-preview source-preview--compact">{JSON.stringify({ status: operation.plan.status, kind: operation.plan.operation_kind, target: operation.plan.target_relative_path, destination: operation.plan.destination_relative_path, source_hash: operation.plan.source_hash, plan_hash: operation.plan.plan_hash, risks: operation.plan.risk_labels, blocked: operation.plan.blocked_reason, steps: operation.plan.plan_steps }, null, 2)}</pre> : null}
      {operation?.result ? (
        <div className={operation.result.mutation_performed ? "success-note" : "error-note"}>
          <strong>{operation.result.operation_kind}: {operation.result.status}</strong>
          <p>Mutation {operation.result.mutation_performed ? "yes" : "no"} · audit {operation.result.audit_written ? "yes" : "no"} · request {operation.result.request_id ?? "not returned"}</p>
          {operation.result.backup_relative_path ? <p>Backup {operation.result.backup_relative_path} · receipt {operation.result.rollback_receipt_id ?? "not returned"}</p> : null}
          {operation.result.blocked_reason ? <p>Blocked: {operation.result.blocked_reason}</p> : null}
          <p>{operation.result.rollback_note}</p>
        </div>
      ) : null}
      {operation?.lastError ? <p className="error-note">{operation.lastError}</p> : null}
    </section>
  );
}
