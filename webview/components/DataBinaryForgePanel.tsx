import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  kind: "database" | "binary";
  databaseOperation: WebviewState["coding"]["databaseOperation"];
  binaryOperation: WebviewState["coding"]["binaryOperation"];
  busyAction: WebviewState["coding"]["busyAction"];
  onInspectDatabase: () => void;
  onPreviewDatabaseSchema: () => void;
  onInspectBinary: () => void;
};

function short(value?: string): string {
  if (!value) return "not returned";
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function artifact(receipt?: { artifact_id: string; sha256: string; size_bytes: number }): string {
  return receipt ? `${receipt.artifact_id} · ${bytes(receipt.size_bytes)} · hash ${short(receipt.sha256)}` : "not created";
}

export default function DataBinaryForgePanel({ kind, databaseOperation, binaryOperation, busyAction, onInspectDatabase, onPreviewDatabaseSchema, onInspectBinary }: Props) {
  if (kind === "database") {
    const inspection = databaseOperation?.inspection;
    const schema = databaseOperation?.schemaPreview;
    const schemaAvailable = inspection?.descriptor.schema_preview_state === "approval_required" && Boolean(inspection.source_sha256 && inspection.schema_preview_plan_hash);
    const sidecars = inspection ? Object.entries(inspection.sidecars).filter(([, value]) => value.present).map(([name]) => name) : [];
    return (
      <div className="document-preview">
        <div className="document-preview__head">
          <div>
            <strong>DatabaseForge stewardship</strong>
            <p className="muted">identify → static metadata → exact-approved read-only snapshot</p>
          </div>
          <span className="pill">schema privacy gate</span>
        </div>
        <div className="button-row">
          <button className="ghost" disabled={busyAction === "databaseInspect"} onClick={onInspectDatabase}>
            {busyAction === "databaseInspect" ? "Identifying..." : "Identify database"}
          </button>
          <button className="ghost" disabled={busyAction === "databaseSchema" || !schemaAvailable} onClick={onPreviewDatabaseSchema}>
            {busyAction === "databaseSchema" ? "Snapshotting..." : "Preview schema with approval"}
          </button>
        </div>
        {inspection ? (
          <>
            <dl className="facts facts--single">
              <div><dt>Detected</dt><dd>{inspection.descriptor.label} · content {inspection.detected_engine} · extension {inspection.extension_type}</dd></div>
              <div><dt>Static metadata</dt><dd>{bytes(inspection.size_bytes)} · magic {inspection.magic_summary}</dd></div>
              <div><dt>Hash</dt><dd>SHA-256 {short(inspection.source_sha256)} · BLAKE3 {short(inspection.source_blake3)}</dd></div>
              <div><dt>Match</dt><dd>{inspection.extension_content_match ? "extension and content agree" : "extension/content mismatch or unknown"}</dd></div>
              <div><dt>Sidecars</dt><dd>{sidecars.join(", ") || "none detected"}</dd></div>
              <div><dt>Approval</dt><dd>schema {inspection.descriptor.schema_preview_state} · exact source hash and plan required</dd></div>
              <div><dt>Artifact</dt><dd>{artifact(inspection.artifact)}</dd></div>
              <div><dt>Trace</dt><dd>request {short(inspection.request_id)} · operation {short(inspection.operation_id)} · audit {inspection.audit_written ? "persisted" : "not returned"}</dd></div>
            </dl>
            <details>
              <summary>Database policy and autonomy boundary</summary>
              <p className="muted">Policy {inspection.policy_version} · worker {inspection.worker_policy_version} · row preview {inspection.descriptor.row_preview_state} · arbitrary SQL {inspection.descriptor.arbitrary_sql_state} · mutation {inspection.descriptor.mutation_state} · load/install {inspection.descriptor.install_load_state}</p>
              <p className="muted">Detailed metadata stays in the private local artifact. Unknown .db files remain metadata-only.</p>
            </details>
          </>
        ) : null}
        {schema ? (
          <>
            <dl className="facts facts--single">
              <div><dt>Schema counts</dt><dd>{schema.table_count} tables · {schema.view_count} views · {schema.index_count} indexes · {schema.trigger_count} triggers</dd></div>
              <div><dt>Snapshot</dt><dd>{schema.snapshot_strategy ?? "not returned"} · hash {short(schema.snapshot_sha256)}</dd></div>
              <div><dt>Risk summary</dt><dd>{Object.entries(schema.risk_counts).map(([code, count]) => `${code} (${count})`).join(" · ") || "no named policy flags"}</dd></div>
              <div><dt>Artifact</dt><dd>{artifact(schema.artifact)}</dd></div>
              <div><dt>Proof</dt><dd>rows {schema.row_data_returned ? "returned" : "not returned"} · arbitrary SQL {schema.arbitrary_sql_executed ? "ran" : "did not run"} · mutation {schema.mutation_performed ? "occurred" : "did not occur"}</dd></div>
              <div><dt>Approval/audit</dt><dd>{short(schema.approval_id)} · audit {schema.audit_written ? "persisted" : "not returned"}</dd></div>
            </dl>
          </>
        ) : null}
        {inspection?.blocked_reason ? <p className="error-note">Blocked: {inspection.blocked_reason}</p> : null}
        {schema?.blocked_reason ? <p className="error-note">Blocked: {schema.blocked_reason}</p> : null}
        {databaseOperation?.lastError ? <p className="error-note">{databaseOperation.lastError}</p> : null}
        <p className="muted">Static metadata only. Schema preview requires exact approval. Row/data preview, arbitrary SQL, export, extension loading, mutation, and external access are unavailable by design.</p>
      </div>
    );
  }

  const inspection = binaryOperation?.inspection;
  return (
    <div className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>BinaryForge stewardship</strong>
          <p className="muted">bounded static metadata only · never execute or load</p>
        </div>
        <span className="pill">static only</span>
      </div>
      <div className="button-row">
        <button className="ghost" disabled={busyAction === "binaryInspect"} onClick={onInspectBinary}>
          {busyAction === "binaryInspect" ? "Inspecting..." : "Inspect static metadata"}
        </button>
      </div>
      {inspection ? (
        <>
          <dl className="facts facts--single">
            <div><dt>Detected</dt><dd>{inspection.descriptor.label} · content {inspection.detected_format} · extension {inspection.extension_type}</dd></div>
            <div><dt>Platform</dt><dd>{inspection.architecture ?? "unknown"} · {inspection.bitness ?? "unknown"}-bit · {inspection.endianness ?? "unknown"}</dd></div>
            <div><dt>Static metadata</dt><dd>{bytes(inspection.size_bytes)} · {inspection.section_count} sections · entropy {inspection.entropy?.toFixed(3) ?? "unknown"}</dd></div>
            <div><dt>Hash</dt><dd>SHA-256 {short(inspection.source_sha256)} · BLAKE3 {short(inspection.source_blake3)}</dd></div>
            <div><dt>Symbols</dt><dd>{inspection.import_count} imports · {inspection.export_count} exports · {inspection.symbol_count} symbols · {inspection.string_count} bounded strings</dd></div>
            <div><dt>Risk summary</dt><dd>{inspection.risk_flags.map((risk) => `${risk.code} (${risk.count}, ${risk.severity})`).join(" · ") || "no policy flags; this is not a safety verdict"}</dd></div>
            <div><dt>Artifact</dt><dd>{artifact(inspection.artifact)}</dd></div>
            <div><dt>Trace</dt><dd>request {short(inspection.request_id)} · operation {short(inspection.operation_id)} · audit {inspection.audit_written ? "persisted" : "not returned"}</dd></div>
          </dl>
          <details>
            <summary>Binary policy and toolchain truth</summary>
            <p className="muted">Policy {inspection.policy_version} · worker {inspection.worker_policy_version} · tools {inspection.toolchain.join(", ") || "bounded built-in parsers"}</p>
            <p className="muted">Disassembly {inspection.descriptor.disassembly_state} · execution {inspection.descriptor.execution_state} · load {inspection.descriptor.load_state} · install {inspection.descriptor.install_state} · mutation {inspection.descriptor.mutation_state} · patch {inspection.descriptor.patch_state}</p>
            <p className="muted">Proof: execution {inspection.execution_performed ? "occurred" : "did not occur"} · loading {inspection.loading_performed ? "occurred" : "did not occur"} · mutation {inspection.mutation_performed ? "occurred" : "did not occur"}.</p>
          </details>
        </>
      ) : null}
      {inspection?.blocked_reason ? <p className="error-note">Blocked: {inspection.blocked_reason}</p> : null}
      {binaryOperation?.lastError ? <p className="error-note">{binaryOperation.lastError}</p> : null}
      <p className="muted">Execution unavailable by design. Loading, import, installation, linking, trust, patching, mutation, and decompilation are unavailable; future disassembly requires a separate sandbox.</p>
    </div>
  );
}
