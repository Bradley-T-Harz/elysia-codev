import * as React from "react";
import { useState } from "react";
import type { UiMessage, UiSession } from "../types";

type Props = { activeSession: UiSession | null; messages: UiMessage[]; onSend: (text: string) => void; onRefresh: () => void };

export default function ChatPane({ activeSession, messages, onSend, onRefresh }: Props) {
  const [text, setText] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }
  return (
    <section className="panel chat-panel">
      <div className="panel-head"><span>{activeSession?.title ?? "Current work"}</span><button onClick={onRefresh}>Refresh</button></div>
      <div className="messages">
        {messages.length === 0 ? <div className="empty-state">Ask Elysia about the current coding task. This shell does not mutate files or run commands.</div> : messages.map((message) => (
          <article key={message.id} className={`message message--${message.role}`}>
            <strong>{message.role === "elysia" ? "Elysia" : message.role}</strong>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask Elysia..." rows={3} />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
