import * as React from "react";
import type { WebviewState, UiSession } from "../types";

type Props = {
  sessions: UiSession[];
  activeSessionId: string | null;
  busyAction?: WebviewState["coding"]["busyAction"];
  onNewSession: () => void;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClear: () => void;
};

export default function SessionList({ sessions, activeSessionId, busyAction, onNewSession, onSelect, onDelete, onClear }: Props) {
  const busy = Boolean(busyAction);
  return (
    <section className="panel session-panel">
      <div className="panel-head"><span>Sessions</span><button disabled={busy} onClick={onNewSession}>{busyAction === "newSession" ? "Creating..." : "New"}</button></div>
      {sessions.length === 0 ? <p className="muted">No local sessions yet.</p> : sessions.map((session) => (
        <article key={session.id} className={`session-card ${session.id === activeSessionId ? "session-card--active" : ""}`}>
          <button className="session-select" disabled={busyAction === "deleteSession"} onClick={() => onSelect(session.id)}>
            <strong>{session.title}</strong>
            <span>{session.workspaceLabel}</span>
            <small>{session.status} · {session.approvalMode}</small>
            <small>{session.backendSessionId ? `backend ${session.backendSessionId}` : "local UI session only"}</small>
          </button>
          <button className="session-delete" disabled={busy} onClick={() => onDelete(session.id)} aria-label={`Delete ${session.title}`}>Delete</button>
        </article>
      ))}
      <button className="ghost" disabled={busy || sessions.length === 0} onClick={onClear}>{busyAction === "clearSessions" ? "Clearing..." : "Clear local sessions"}</button>
    </section>
  );
}
