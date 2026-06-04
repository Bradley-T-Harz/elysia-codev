import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  workMode: WebviewState["workMode"];
  onConnectForge: () => void;
  onSendContextToForge: () => void;
};

export default function WorkModePanel({ workMode, onConnectForge, onSendContextToForge }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Work Mode</span>
        <span className="pill">local first</span>
      </div>
      <dl className="facts facts--single">
        <div><dt>Current</dt><dd>{workMode.mode === "local" ? "Work locally" : "Developer Forge"}</dd></div>
        <div><dt>Developer Forge</dt><dd>{workMode.forgeStatus.replaceAll("_", " ")}</dd></div>
      </dl>
      <p className="muted">Developer Forge is a future private individual developer account, not a public community hub.</p>
      <div className="button-row">
        <button className="ghost" type="button" disabled>Work locally</button>
        <button className="ghost" type="button" onClick={onConnectForge}>Connect Developer Forge</button>
        <button className="ghost" type="button" disabled={!workMode.selectedContextSendAllowed} onClick={onSendContextToForge}>
          Send selected context to Forge
        </button>
      </div>
      {workMode.notes.length ? <p className="muted">{workMode.notes.join(" ")}</p> : null}
    </section>
  );
}
