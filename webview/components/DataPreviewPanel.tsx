import * as React from "react";
import type { FileReadPreview, WebviewState } from "../types";

type Props = {
  filePreview: FileReadPreview;
  operation: WebviewState["coding"]["dataOperation"];
  busyAction: WebviewState["coding"]["busyAction"];
  onInspect: () => void;
  onPreview: () => void;
  onPlanExport: (exportFormat: "markdown" | "json") => void;
  onApplyExport: () => void;
  onPlanMutation: (operation: string, parameters: Record<string, unknown>) => void;
  onApplyMutation: () => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function defaultMutationFor(filePreview: FileReadPreview): { operation: string; parameters: Record<string, unknown>; label: string; reason?: string } {
  const summary = asRecord(filePreview.parse_summary);
  const descriptor = asRecord(summary.descriptor);
  const typeId = String(descriptor.type_id ?? filePreview.file_type_id ?? "");
  if (typeId === "csv_table" || typeId === "tsv_table") {
    return { operation: "tabular_append_row", parameters: { row: { name: "approved_codev_row" } }, label: "Plan row append" };
  }
  if (typeId === "json_lines") {
    return { operation: "jsonl_append_record", parameters: { record: { source: "codev", approved: true } }, label: "Plan JSONL append" };
  }
  if (typeId === "sqlite_database") {
    return { operation: "sqlite_insert_row", parameters: { table: "samples", row: { name: "approved_codev_row" } }, label: "Plan SQLite insert" };
  }
  if (typeId === "geojson_vector") {
    return { operation: "geojson_update_properties", parameters: { feature_index: 0, properties: { reviewed_by: "codev" } }, label: "Plan GeoJSON property edit" };
  }
  if (typeId === "kml_vector") {
    return { operation: "kml_rename_placemark", parameters: { placemark_index: 0, name: "Approved Codev Placemark" }, label: "Plan KML placemark rename" };
  }
  const relativePath = String(filePreview.relative_path ?? filePreview.file_label ?? "data-output");
  if (typeId === "geopackage" || typeId === "shapefile") {
    return { operation: "vector_export_derived", parameters: { target_path: `${relativePath}.derived.geojson` }, label: "Plan vector derived export" };
  }
  if (typeId === "geotiff_raster") {
    return { operation: "raster_update_tags", parameters: { target_path: `${relativePath}.tagged.tif`, tags: { reviewed_by: "codev" } }, label: "Plan raster tag copy" };
  }
  if (typeId === "netcdf_dataset") {
    return { operation: "netcdf_update_attr", parameters: { target_path: `${relativePath}.attrs.nc`, attr_name: "reviewed_by", value: "codev" }, label: "Plan NetCDF attr copy" };
  }
  if (typeId === "hdf5_dataset") {
    return { operation: "hdf5_update_attr", parameters: { target_path: `${relativePath}.attrs.h5`, object_path: "/", attr_name: "reviewed_by", value: "codev" }, label: "Plan HDF5 attr copy" };
  }
  if (typeId === "zarr_store") {
    return { operation: "zarr_update_attr", parameters: { target_path: `${relativePath}.attrs.zarr`, object_path: "/", attr_name: "reviewed_by", value: "codev" }, label: "Plan Zarr attr copy" };
  }
  return { operation: "unsupported", parameters: {}, label: "Plan governed data operation", reason: "This data type currently exposes inspection, bounded preview, and export from Codev. Mutation controls appear only when a stable adapter-specific operation is available." };
}

export default function DataPreviewPanel({ filePreview, operation, busyAction, onInspect, onPreview, onPlanExport, onApplyExport, onPlanMutation, onApplyMutation }: Props) {
  const summary = asRecord(filePreview.parse_summary);
  const descriptor = asRecord(summary.descriptor);
  const metadata = asRecord(summary.metadata);
  const schema = asRecord(summary.schema_summary);
  const mutation = defaultMutationFor(filePreview);
  const exportReady = operation?.exportPlan?.status === "planned";
  const mutationReady = operation?.mutationPlan?.status === "planned";

  return (
    <div className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>{String(descriptor.label ?? filePreview.file_type_label ?? "Science/data file")}</strong>
          <p className="muted">
            {String(descriptor.category ?? "science_data")} · adapter {String(descriptor.adapter ?? filePreview.adapter ?? "data")} · status {String(summary.status ?? filePreview.status)}
          </p>
        </div>
        <span className={summary.blocked_reason ? "pill pill--warn" : "pill"}>{summary.blocked_reason ? "blocked" : "bounded"}</span>
      </div>
      <dl className="facts facts--single">
        <div><dt>Content hash</dt><dd>{String(summary.content_hash ?? filePreview.content_hash ?? filePreview.byte_hash ?? "not returned")}</dd></div>
        <div><dt>Size</dt><dd>{String(summary.size_bytes ?? filePreview.byte_count ?? 0)} bytes</dd></div>
        <div><dt>Metadata</dt><dd>{Object.keys(metadata).length} fields</dd></div>
        <div><dt>Schema</dt><dd>{Object.keys(schema).length} sections</dd></div>
        <div><dt>Redactions</dt><dd>{String(summary.redaction_count ?? 0)}</dd></div>
      </dl>
      <div className="button-row">
        <button className="ghost" disabled={busyAction === "dataInspect"} onClick={onInspect}>
          {busyAction === "dataInspect" ? "Inspecting..." : "Inspect data"}
        </button>
        <button className="ghost" disabled={busyAction === "dataPreview"} onClick={onPreview}>
          {busyAction === "dataPreview" ? "Previewing..." : "Preview data"}
        </button>
        <button className="ghost" disabled={busyAction === "dataExportPlan"} onClick={() => onPlanExport("markdown")}>
          Plan Markdown summary
        </button>
        <button className="ghost" disabled={busyAction === "dataExportPlan"} onClick={() => onPlanExport("json")}>
          Plan JSON summary
        </button>
        <button className="ghost" disabled={!exportReady || busyAction === "dataExportApply"} onClick={onApplyExport}>
          Approve data export
        </button>
        <button className="ghost" disabled={Boolean(mutation.reason) || busyAction === "dataMutationPlan"} onClick={() => onPlanMutation(mutation.operation, mutation.parameters)}>
          {mutation.label}
        </button>
        <button className="ghost" disabled={!mutationReady || busyAction === "dataMutationApply"} onClick={onApplyMutation}>
          Approve data mutation
        </button>
      </div>
      {mutation.reason ? <p className="muted">{mutation.reason}</p> : null}
      {summary.warnings ? <p className="muted">Warnings: {String(summary.warnings)}</p> : null}
      {operation?.exportPlan ? (
        <div className="document-preview__result">
          <strong>Data export plan</strong>
          <p className="muted">{operation.exportPlan.status}: {operation.exportPlan.plan_summary}</p>
          {operation.exportPlan.preview ? <pre className="source-preview source-preview--compact">{operation.exportPlan.preview}</pre> : null}
        </div>
      ) : null}
      {operation?.mutationPlan ? (
        <div className="document-preview__result">
          <strong>Data mutation plan</strong>
          <p className="muted">{operation.mutationPlan.status}: {operation.mutationPlan.plan_summary}</p>
          {operation.mutationPlan.blocked_reason ? <p className="error-note">Blocked: {operation.mutationPlan.blocked_reason}</p> : null}
          <pre className="source-preview source-preview--compact">{JSON.stringify({ transaction: operation.mutationPlan.transaction, backup: operation.mutationPlan.backup, details: operation.mutationPlan.operation_details }, null, 2)}</pre>
        </div>
      ) : null}
      {operation?.applyResult ? (
        <div className="document-preview__result">
          <strong>Data operation result</strong>
          <p className="muted">{operation.applyResult.action} {operation.applyResult.status} · mutation {operation.applyResult.mutation_performed ? "yes" : "no"} · audit {operation.applyResult.audit_written ? "yes" : "no"}</p>
          {operation.applyResult.blocked_reason ? <p className="error-note">Blocked: {operation.applyResult.blocked_reason}</p> : null}
          <pre className="source-preview source-preview--compact">{JSON.stringify({ backup: operation.applyResult.backup, details: operation.applyResult.operation_details }, null, 2)}</pre>
        </div>
      ) : null}
      {operation?.lastError ? <p className="error-note">{operation.lastError}</p> : null}
      <p className="muted">Data operations stay local and approval-gated. No arbitrary SQL, shell, package manager, cloud upload, or unbounded full-dataset load is enabled.</p>
    </div>
  );
}
