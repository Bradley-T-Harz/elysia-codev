import * as React from "react";
import type { WebviewState } from "../types";

type Props = { records: WebviewState["coding"]["operationAudits"] };

function short(value: string | undefined): string {
  if (!value) return "not recorded";
  return value.length > 28 ? `${value.slice(0, 12)}…${value.slice(-10)}` : value;
}

export default function OperationAuditPanel({ records }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Governed Operation Audit</span>
        <span className="pill">sanitized local truth</span>
      </div>
      <p className="muted">Compact records only: identifiers, relative paths, hashes, approval state, mutation/shell flags, and backup truth. No full content, absolute paths, or command logs.</p>
      {!records.length ? <p className="muted">No coding operation audit has been loaded in this Codev session.</p> : null}
      {records.slice(0, 8).map((record, index) => (
        <div className="document-preview__result" key={record.operation_id ?? `${record.timestamp_utc ?? "audit"}-${index}`}>
          <strong>{record.operation_kind ?? record.kind ?? "coding operation"} · {record.status ?? "recorded"}</strong>
          <dl className="facts facts--single">
            <div><dt>Request</dt><dd>{short(record.request_id)}</dd></div>
            <div><dt>Operation</dt><dd>{short(record.operation_id)}</dd></div>
            <div><dt>Approval</dt><dd>{short(record.approval_id)}</dd></div>
            <div><dt>Paths</dt><dd>{record.relative_paths?.join(", ") || "none recorded"}</dd></div>
            <div><dt>Source/plan/result</dt><dd>{short(record.source_hash)} · {short(record.plan_hash)} · {short(record.result_hash)}</dd></div>
            <div><dt>Effect</dt><dd>mutation {record.mutation_performed ? "yes" : "no"} · shell {record.shell_execution ? "yes" : "no"} · durable audit {record.audit_persisted === false ? "no" : "yes"}</dd></div>
          </dl>
        </div>
      ))}
    </section>
  );
}
