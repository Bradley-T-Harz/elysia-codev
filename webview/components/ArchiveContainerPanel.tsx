import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import type { WebviewState } from "../types";

type Props = {
  operation: WebviewState["coding"]["archiveOperation"];
  busyAction: WebviewState["coding"]["busyAction"];
  canMutate: boolean;
  onInspect: () => void;
  onPlan: (selectedMemberIndexes: number[]) => void;
  onApply: () => void;
};

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

export default function ArchiveContainerPanel({ operation, busyAction, canMutate, onInspect, onPlan, onApply }: Props) {
  const preview = operation?.inspectPreview;
  const plan = operation?.extractionPlan;
  const result = operation?.extractionResult;
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => setSelected([]), [preview?.operation_id]);
  const selectable = useMemo(() => preview?.members.filter((member) => member.extractable && member.is_regular_file) ?? [], [preview]);
  const blockingRisk = preview?.risk_flags.some((risk) => risk.blocks_extraction) ?? false;

  function toggle(index: number) {
    setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index].sort((a, b) => a - b));
  }

  return (
    <div className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>ArchiveForge container stewardship</strong>
          <p className="muted">inspect → risk report → exact plan → selected sandbox extraction</p>
        </div>
        <span className="pill">sandbox only</span>
      </div>
      <div className="button-row">
        <button className="ghost" disabled={busyAction === "archiveInspect"} onClick={onInspect}>
          {busyAction === "archiveInspect" ? "Inspecting..." : "List contents & risk"}
        </button>
        <button className="ghost" disabled={busyAction === "archivePlan" || !preview?.descriptor.selected_sandbox_extraction_supported || blockingRisk || selected.length === 0} onClick={() => onPlan(selected)}>
          {busyAction === "archivePlan" ? "Planning..." : "Plan selected sandbox extraction"}
        </button>
        <button className="ghost" disabled={!canMutate || busyAction === "archiveApply" || plan?.status !== "planned"} onClick={onApply}>
          {busyAction === "archiveApply" ? "Extracting..." : "Extract selected to sandbox"}
        </button>
      </div>
      {preview ? (
        <>
          <dl className="facts facts--single">
            <div><dt>Type</dt><dd>{preview.descriptor.label} · inspect {preview.descriptor.inspection_state} · extraction {preview.descriptor.extraction_state}</dd></div>
            <div><dt>Members</dt><dd>{preview.member_count} · projected {bytes(preview.projected_uncompressed_bytes)} · ratio {preview.compression_ratio}:1</dd></div>
            <div><dt>Risk</dt><dd>{preview.risk_flags.map((risk) => `${risk.code} (${risk.count})`).join(" · ") || "No policy risk flags"}</dd></div>
            <div><dt>Boundary</dt><dd>install unavailable · execute/import/open unavailable · project extraction blocked</dd></div>
            <div><dt>Trace</dt><dd>request {preview.request_id ?? "not returned"} · operation {preview.operation_id} · audit {preview.audit_written ? "persisted" : "not returned"}</dd></div>
          </dl>
          {selectable.length ? (
            <details>
              <summary>Select eligible regular files ({selected.length} selected)</summary>
              <div className="toggle-list">
                {selectable.slice(0, 200).map((member) => (
                  <label className="toggle-row" key={`${member.index}-${member.path_hash}`}>
                    <input type="checkbox" checked={selected.includes(member.index)} onChange={() => toggle(member.index)} />
                    <span><strong>{member.display_path}</strong><small>{bytes(member.uncompressed_size)} · regular file · no recursive expansion</small></span>
                  </label>
                ))}
              </div>
            </details>
          ) : <p className="muted">No member is eligible for extraction under this format/risk policy.</p>}
          <details>
            <summary>Advanced ArchiveForge truth</summary>
            <p className="muted">Manifest {preview.manifest_digest ?? "not returned"} · policy {preview.policy_version} · tool {preview.tool_used} · license {preview.descriptor.tool_license_status}</p>
            {preview.package_metadata ? <pre className="source-preview source-preview--compact">{JSON.stringify(preview.package_metadata, null, 2)}</pre> : null}
          </details>
        </>
      ) : null}
      {plan ? <p className={plan.status === "planned" ? "success-note" : "error-note"}>Plan {plan.status} · {plan.selected_file_count} files · {bytes(plan.projected_write_bytes)} · sandbox hash {plan.sandbox_destination_hash}{plan.blocked_reason ? ` · ${plan.blocked_reason}` : " · fresh exact approval required"}</p> : null}
      {result ? <p className={result.status === "completed" ? "success-note" : "error-note"}>Result {result.status} · {result.extracted_file_count} files · {bytes(result.extracted_bytes)} · source/project mutation no/no · install/execute no/no · audit {result.audit_written ? "persisted" : "not returned"}{result.blocked_reason ? ` · ${result.blocked_reason}` : ""}</p> : null}
      {operation?.lastError ? <p className="error-note">{operation.lastError}</p> : null}
      <p className="muted">Archive contents are never trusted, auto-opened, installed, executed, imported, or moved into the workspace. Extraction is never autonomous.</p>
    </div>
  );
}
