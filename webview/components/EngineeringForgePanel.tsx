import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  operation: WebviewState["coding"]["engineeringOperation"];
  busyAction: WebviewState["coding"]["busyAction"];
  onInspect: () => void;
  onPlanPreview: () => void;
  onApplyPreview: () => void;
};

function humanize(value?: string | null): string {
  return (value ?? "unknown").replace(/[_-]/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortHash(value?: string | null): string {
  return value ? `${value.slice(0, 11)}…${value.slice(-7)}` : "not returned";
}

const engineeringFamilies = ["Geometry", "CAD", "Robot Model", "CAM / G-code", "Blend", "Fusion limited"] as const;

export default function EngineeringForgePanel({ operation, busyAction, onInspect, onPlanPreview, onApplyPreview }: Props) {
  const inspection = operation?.inspection;
  const plan = operation?.previewPlan;
  const result = operation?.previewResult;
  const previewAvailable = inspection?.descriptor.preview_state === "approval_required" && Boolean(inspection.preview_plan_hash);
  return (
    <div className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>EngineeringForge stewardship</strong>
          <p className="muted">identify → bounded static report → exact-approved local projection</p>
        </div>
        <span className="pill">no actuation</span>
      </div>
      <div className="button-row">
        <button className="ghost" disabled={busyAction === "engineeringInspect"} onClick={onInspect}>
          {busyAction === "engineeringInspect" ? "Inspecting..." : "Inspect engineering file"}
        </button>
        <button className="ghost" disabled={busyAction === "engineeringPreviewPlan" || !previewAvailable} onClick={onPlanPreview}>
          {busyAction === "engineeringPreviewPlan" ? "Planning..." : "Plan safe local preview"}
        </button>
        <button className="ghost" disabled={busyAction === "engineeringPreviewApply" || plan?.status !== "planned"} onClick={onApplyPreview}>
          {busyAction === "engineeringPreviewApply" ? "Creating..." : "Create preview with approval"}
        </button>
      </div>
      <div className="button-row" aria-label="EngineeringForge subpanels">
        {engineeringFamilies.map((family) => <span className="pill" key={family}>{family}</span>)}
      </div>
      {inspection ? (
        <>
          <dl className="facts facts--single">
            <div><dt>Detected</dt><dd>{inspection.descriptor.forge} · {inspection.descriptor.label} · {inspection.magic_summary}</dd></div>
            <div><dt>Source hash / size</dt><dd>SHA-256 {shortHash(inspection.source_sha256)} · {inspection.size_bytes} bytes</dd></div>
            <div><dt>Capability truth</dt><dd>live through level {inspection.descriptor.maximum_live_level} · preview {humanize(inspection.descriptor.preview_state)} · conversion {humanize(inspection.descriptor.conversion_state)}</dd></div>
            <div><dt>Risk</dt><dd>{inspection.risk_flags.map((item) => `${humanize(item.code)} (${item.count}, ${item.severity})`).join(" · ") || "No named static flags; not a safety verdict"}</dd></div>
            <div><dt>References</dt><dd>{inspection.external_references.map((item) => `${item.display_reference} · ${humanize(item.resolution_state)}`).join(" · ") || "none reported"}</dd></div>
            <div><dt>Artifacts</dt><dd>{inspection.artifacts.map((item) => `${item.file_name} · ${item.artifact_id}`).join(" · ") || "none"}</dd></div>
            <div><dt>Trace</dt><dd>request {shortHash(inspection.request_id)} · operation {shortHash(inspection.operation_id)} · audit {inspection.audit_written ? "persisted" : "not returned"}</dd></div>
          </dl>
          <details>
            <summary>Static report and policy truth</summary>
            <pre className="source-preview source-preview--compact">{JSON.stringify(inspection.report, null, 2)}</pre>
            <p className="muted">Worker boundary {inspection.worker_key} · {humanize(inspection.worker_state)} · policy {inspection.worker_policy_version}. Source mutation, network, scripts, plugins, and physical output: no/no/no/no/no.</p>
          </details>
        </>
      ) : null}
      {plan ? <p className={plan.status === "planned" ? "success-note" : "error-note"}>Preview plan {humanize(plan.status)} · {humanize(plan.preview_kind)} · source {shortHash(plan.source_sha256)}{plan.blocked_reason ? ` · ${humanize(plan.blocked_reason)}` : " · exact one-time approval required"}</p> : null}
      {result ? <p className={result.status === "completed" ? "success-note" : "error-note"}>Preview {humanize(result.status)} · artifact {result.artifact?.artifact_id ?? "not created"} · receipt {result.receipt_artifact?.artifact_id ?? "not created"} · source/project mutation no/no · physical output no{result.blocked_reason ? ` · ${humanize(result.blocked_reason)}` : ""}</p> : null}
      {operation?.lastError ? <p className="error-note">{operation.lastError}</p> : null}
      <p className="muted">Reports and projections are descriptive only. Physical output remains unavailable by design. Codev has no Run, Machine, Print, Send, Execute, ROS/Gazebo launch, Blender-script, Fusion-upload, patch, overwrite, or “trust as safe” engineering control.</p>
    </div>
  );
}
