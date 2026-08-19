import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  workMode: WebviewState["workMode"];
};

export default function WorkModePanel({ workMode }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Work Mode</span>
        <span className="pill">local first</span>
      </div>
      <dl className="facts facts--single">
        <div><dt>Current</dt><dd>{workMode.mode === "local" ? "Work locally" : "Unavailable"}</dd></div>
        <div><dt>External context transfer</dt><dd>{workMode.selectedContextSendAllowed ? "explicitly enabled" : "disabled"}</dd></div>
      </dl>
      <p className="muted">Codev v0.1 operates through the authenticated local Elysia bridge. It has no cloud-upload or external-context action.</p>
      {workMode.notes.length ? <p className="muted">{workMode.notes.join(" ")}</p> : null}
    </section>
  );
}
