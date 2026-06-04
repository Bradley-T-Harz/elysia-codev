import * as React from "react";
import { useState } from "react";
import type { WebviewState, UiMessage, UiSession } from "../types";

type Props = { activeSession: UiSession | null; messages: UiMessage[]; busyAction?: WebviewState["coding"]["busyAction"]; onSend: (text: string) => void; onRefresh: () => void };

export default function ChatPane({ activeSession, messages, busyAction, onSend, onRefresh }: Props) {
  const [text, setText] = useState("");
  const busy = Boolean(busyAction);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }
  return (
    <section className="panel chat-panel">
      <div className="panel-head"><span>{activeSession?.title ?? "Current work"}</span><button disabled={busy} onClick={onRefresh}>{busyAction === "refresh" ? "Refreshing..." : "Refresh"}</button></div>
      <div className="messages">
        {!activeSession ? <div className="empty-state">Create or select a session to bind chat messages to a coding room.</div> : messages.length === 0 ? <div className="empty-state">Ask Elysia about this session. Chat can plan and propose; apply/check actions stay in their approval-gated cards.</div> : messages.map((message) => (
          <article key={message.id} className={`message message--${message.role}`}>
            <strong>{message.role === "elysia" ? "Elysia" : message.role}</strong>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={activeSession ? "Ask Elysia..." : "Create a session first..."} rows={3} disabled={busyAction === "chat"} />
        <button type="submit" disabled={!activeSession || busyAction === "chat"}>{busyAction === "chat" ? "Sending..." : "Send"}</button>
      </form>
    </section>
  );
}
