import * as React from "react";
import type { FileReadPreview, WebviewState } from "../types";

type Props = {
  filePreview: FileReadPreview;
  operation: WebviewState["coding"]["visualOperation"];
  busyAction: WebviewState["coding"]["busyAction"];
  canMutate: boolean;
  onInspect: () => void;
  onPreview: () => void;
  onOcr: () => void;
  onAnalyze: () => void;
  onPlanExport: (exportFormat: "markdown" | "json" | "png" | "jpg" | "webp" | "tiff" | "svg") => void;
  onApplyExport: () => void;
  onPlanEdit: (operation: string, parameters: Record<string, unknown>) => void;
  onApplyEdit: () => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function defaultVisualEdit(filePreview: FileReadPreview): { operation: string; parameters: Record<string, unknown>; label: string; reason?: string } {
  const summary = asRecord(filePreview.parse_summary);
  const descriptor = asRecord(summary.descriptor);
  const capabilities = asRecord(descriptor.capabilities);
  const stableOperations = Array.isArray(capabilities.stable_operations)
    ? capabilities.stable_operations.map(String)
    : [];
  const relative = filePreview.relative_path ?? filePreview.file_label;
  if (stableOperations.includes("strip_exif")) {
    return { operation: "strip_exif", parameters: { target_path: `${relative}.stripped.png` }, label: "Plan strip EXIF copy" };
  }
  if (stableOperations.includes("make_thumbnail")) {
    return { operation: "make_thumbnail", parameters: { target_path: `${relative}.thumb.png`, size: 512 }, label: "Plan thumbnail copy" };
  }
  if (stableOperations.includes("sanitize_svg")) {
    return { operation: "sanitize_svg", parameters: { target_path: `${relative}.sanitized.svg` }, label: "Plan sanitized SVG copy" };
  }
  return { operation: "unsupported", parameters: {}, label: "Plan visual edit", reason: `${relative} has no stable visual edit operation surfaced.` };
}

export default function VisualPreviewPanel({ filePreview, operation, busyAction, canMutate, onInspect, onPreview, onOcr, onAnalyze, onPlanExport, onApplyExport, onPlanEdit, onApplyEdit }: Props) {
  const summary = asRecord(filePreview.parse_summary);
  const metadata = asRecord(summary.metadata);
  const visualPreview = asRecord(summary.preview);
  const exifPrivacy = asRecord(summary.exif_privacy);
  const svgSafety = asRecord(summary.svg_safety);
  const edit = defaultVisualEdit(filePreview);
  const exportReady = operation?.exportPlan?.status === "planned";
  const editReady = operation?.editPlan?.status === "planned";
  const thumbnail = typeof visualPreview.thumbnail_data_url === "string" ? visualPreview.thumbnail_data_url : undefined;

  return (
    <div className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>{String(filePreview.file_type_label ?? "Visual file")}</strong>
          <p className="muted">local visual stewardship · status {filePreview.status}</p>
        </div>
        <span className="pill">derived-copy only</span>
      </div>
      {thumbnail ? <img className="visual-thumbnail" src={thumbnail} alt="" /> : null}
      <dl className="facts facts--single">
        <div><dt>Type</dt><dd>{filePreview.file_type_id ?? "unknown"}</dd></div>
        <div><dt>Metadata</dt><dd>{Object.entries(metadata).slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || "not surfaced"}</dd></div>
        <div><dt>EXIF privacy</dt><dd>{Object.entries(exifPrivacy).slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || "none surfaced"}</dd></div>
        <div><dt>SVG safety</dt><dd>{Object.keys(svgSafety).length ? "sanitized preview available" : "not SVG"}</dd></div>
      </dl>
      <div className="button-row">
        <button className="ghost" disabled={busyAction === "visualInspect"} onClick={onInspect}>
          {busyAction === "visualInspect" ? "Inspecting..." : "Inspect visual"}
        </button>
        <button className="ghost" disabled={busyAction === "visualPreview"} onClick={onPreview}>
          {busyAction === "visualPreview" ? "Previewing..." : "Preview visual"}
        </button>
        <button className="ghost" disabled={busyAction === "visualOcr"} onClick={onOcr}>
          {busyAction === "visualOcr" ? "OCR..." : "Run OCR"}
        </button>
        <button className="ghost" disabled={busyAction === "visualAnalysis"} onClick={onAnalyze}>
          {busyAction === "visualAnalysis" ? "Analyzing..." : "Analyze visual"}
        </button>
        <button className="ghost" disabled={!canMutate || busyAction === "visualExportPlan"} onClick={() => onPlanExport("markdown")}>
          Plan Markdown export
        </button>
        <button className="ghost" disabled={!canMutate || busyAction === "visualExportPlan"} onClick={() => onPlanExport(filePreview.adapter === "svg" ? "png" : "webp")}>
          Plan image export
        </button>
        <button className="ghost" disabled={!canMutate || !exportReady || busyAction === "visualExportApply"} onClick={onApplyExport}>
          Approve export
        </button>
        <button className="ghost" disabled={!canMutate || Boolean(edit.reason) || busyAction === "visualEditPlan"} onClick={() => onPlanEdit(edit.operation, edit.parameters)}>
          {edit.label}
        </button>
        <button className="ghost" disabled={!canMutate || !editReady || busyAction === "visualEditApply"} onClick={onApplyEdit}>
          Approve visual edit
        </button>
      </div>
      {!canMutate ? <p className="muted">Export and derived-edit planning is hidden until apply-with-approval or test-with-approval mode is selected.</p> : null}
      {edit.reason ? <p className="muted">{edit.reason}</p> : null}
      {operation?.ocrResult ? <pre className="source-preview source-preview--compact">{JSON.stringify(operation.ocrResult, null, 2)}</pre> : null}
      {operation?.analysisResult ? <pre className="source-preview source-preview--compact">{JSON.stringify(operation.analysisResult, null, 2)}</pre> : null}
      {operation?.exportPlan ? (
        <div className="document-preview__result">
          <strong>Export plan</strong>
          <p className="muted">{operation.exportPlan.status}: {operation.exportPlan.plan_summary}</p>
          {operation.exportPlan.preview ? <pre className="source-preview source-preview--compact">{operation.exportPlan.preview}</pre> : null}
        </div>
      ) : null}
      {operation?.editPlan ? (
        <div className="document-preview__result">
          <strong>Edit plan</strong>
          <p className="muted">{operation.editPlan.status}: {operation.editPlan.plan_summary}</p>
          {operation.editPlan.operation_details ? <pre className="source-preview source-preview--compact">{JSON.stringify(operation.editPlan.operation_details, null, 2)}</pre> : null}
        </div>
      ) : null}
      {operation?.applyResult ? (
        <div className="document-preview__result">
          <strong>Visual result</strong>
          <p className="muted">{operation.applyResult.action} {operation.applyResult.status} · mutation {operation.applyResult.mutation_performed ? "yes" : "no"} · audit {operation.applyResult.audit_written ? "yes" : "no"}</p>
          <p className="muted">Request {operation.applyResult.request_id ?? "not returned"} · approval {operation.applyResult.approval_id ?? "not returned"}</p>
          {operation.applyResult.backup_relative_path ? <p className="muted">Backup {operation.applyResult.backup_relative_path} · receipt {operation.applyResult.rollback_receipt_id ?? "not returned"}</p> : null}
          {operation.applyResult.blocked_reason ? <p className="error-note">Blocked: {operation.applyResult.blocked_reason}</p> : null}
          <p className="muted">{operation.applyResult.rollback_note}</p>
        </div>
      ) : null}
      {operation?.lastError ? <p className="error-note">{operation.lastError}</p> : null}
      <p className="muted">No cloud OCR/vision, raw pixel audit, precise GPS surfacing, unsanitized SVG rendering, or source mutation is enabled here.</p>
    </div>
  );
}
