import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  result: WebviewState["coding"]["commandResult"];
  capabilities: WebviewState["approvalModeCapabilities"];
  busyAction?: WebviewState["coding"]["busyAction"];
  onRun: (commandId: string) => void;
};

const checks = [
  { id: "git_diff_check", label: "Git diff check" }
];

export default function TestOutputPanel({ result, capabilities, busyAction, onRun }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Approved Checks</span>
        <span className={capabilities.canRunChecks ? "pill" : "pill pill--warn"}>{capabilities.canRunChecks ? "approval checks" : "checks blocked"}</span>
      </div>
      <p className="muted">Runs only the exact local read-only diff check after approval. Workspace-controlled npm/Cargo scripts stay disabled until they have isolated, state-bound execution.</p>
      {!capabilities.canRunChecks ? <p className="muted">Switch to test with approval mode to run the exact read-only diff check.</p> : null}
      <div className="button-row">
        {checks.map((check) => (
          <button className="ghost" key={check.id} disabled={!capabilities.canRunChecks || busyAction === "runCheck"} onClick={() => onRun(check.id)}>
            {busyAction === "runCheck" ? "Running..." : check.label}
          </button>
        ))}
      </div>
      {result ? (
        <div className={result.status === "completed" ? "success-note" : "error-note"}>
          <strong>{result.command_id}: {result.status}</strong>
          {typeof result.exit_code === "number" ? <p>Exit code: {result.exit_code}</p> : null}
          {result.blocked_reason ? <p>Blocked: {result.blocked_reason}</p> : null}
          <p>Request {result.request_id ?? "not returned"} · approval {result.approval_id ?? "see audit record"}</p>
          {result.stdout_preview ? <pre className="source-preview">{result.stdout_preview}</pre> : null}
          {result.stderr_preview ? <pre className="source-preview">{result.stderr_preview}</pre> : null}
        </div>
      ) : null}
    </section>
  );
}
