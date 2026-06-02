import * as React from "react";
import type { UiSession } from "../types";

type Props = { sessions: UiSession[]; activeSessionId: string | null; onNewSession: () => void; onClear: () => void };

export default function SessionList({ sessions, activeSessionId, onNewSession, onClear }: Props) {
  return (
    <section className="panel session-panel">
      <div className="panel-head"><span>Sessions</span><button onClick={onNewSession}>New</button></div>
      {sessions.length === 0 ? <p className="muted">No local sessions yet.</p> : sessions.map((session) => (
        <article key={session.id} className={`session-card ${session.id === activeSessionId ? "session-card--active" : ""}`}>
          <strong>{session.title}</strong>
          <span>{session.workspaceLabel}</span>
          <small>{session.status} · {session.approvalMode}</small>
        </article>
      ))}
      <button className="ghost" onClick={onClear}>Clear local sessions</button>
    </section>
  );
}
