import * as React from "react";
import type { WebviewState } from "../types";

type Props = { result: WebviewState["coding"]["commandResult"]; catalog: WebviewState["coding"]["commandCatalog"]; capabilities: WebviewState["approvalModeCapabilities"]; busyAction?: string; onRun: (commandId: string) => void };
export default function TestOutputPanel({ result, catalog, capabilities, busyAction, onRun }: Props) {
  return (
    <section className="panel">
      <div className="panel-head"><span>Bounded Checks</span><span className={capabilities.canRunChecks ? "pill" : "pill pill--warn"}>{capabilities.canRunChecks ? "exact approval" : "mode blocked"}</span></div>
      <p className="muted">The backend catalog owns exact argv, approved cwd, timeout, output limit, closed stdin, sanitized environment, and no-shell/no-network law.</p>
      <ul className="tool-list">
        {(catalog?.entries ?? []).map((entry) => (
          <li key={entry.command_id}>
            <span><strong>{entry.label}</strong><small>{entry.command.join(" ")} · {entry.purpose}</small></span>
            <button className="ghost" disabled={!capabilities.canRunChecks || !entry.execution_enabled || busyAction === "runCheck"} onClick={() => onRun(entry.command_id)}>{entry.execution_enabled ? "Plan + approve" : entry.disabled_reason ?? "gated"}</button>
          </li>
        ))}
      </ul>
      {!catalog?.entries.length ? <p className="muted">Command catalog unavailable; no command can be submitted.</p> : null}
      {result ? <div className={result.status === "completed" ? "success-note" : "error-note"}>
        <strong>{result.command_id}: {result.status}</strong>
        <p>{result.command?.join(" ") ?? "catalog argv"} · cwd {result.cwd_label ?? "approved repo"} · exit {result.exit_code ?? "not run"}</p>
        <p>Request {result.request_id ?? "none"} · operation {result.operation_id ?? result.run_id ?? "none"} · approval {result.approval_id ?? "none"}</p>
        <p>{result.duration_ms ?? 0} ms · sanitized {result.output_sanitized ? "yes" : "unknown"} · truncated {result.output_truncated ? "yes" : "no"}</p>
        {result.blocked_reason ? <p>Blocked: {result.blocked_reason}</p> : null}
        {result.stdout_preview ? <pre className="source-preview">{result.stdout_preview}</pre> : null}
        {result.stderr_preview ? <pre className="source-preview">{result.stderr_preview}</pre> : null}
      </div> : null}
    </section>
  );
}
