import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import ApprovalBar from "./components/ApprovalBar";
import ChangedFilesPanel from "./components/ChangedFilesPanel";
import ChatPane from "./components/ChatPane";
import GitStatusPanel from "./components/GitStatusPanel";
import PatchPreview from "./components/PatchPreview";
import SessionList from "./components/SessionList";
import SettingsPanel from "./components/SettingsPanel";
import type { ApprovalMode, VsCodeApi, WebviewState } from "./types";

type AppProps = { vscode: VsCodeApi };

const emptyState: WebviewState = {
  connection: { state: "unknown", apiUrl: "http://127.0.0.1:8000", summary: "Waiting for extension host." },
  workspace: { trustLevel: "no_workspace", workspaceLabel: "No workspace", workspaceFolders: [], canReadWorkspace: false, canProposePatch: false, canApplyPatch: false, canRunCommand: false },
  sessions: [],
  activeSessionId: null,
  messages: [],
  approvalMode: "plan_only",
  git: { branch: "Not inspected", dirtyState: "unknown", changedCount: 0, summary: "No repo inspected." },
  changedFiles: [],
  patchPreview: { state: "empty", summary: "No patch proposed.", files: [], canApply: false }
};

export default function App({ vscode }: AppProps) {
  const [state, setState] = useState<WebviewState>(emptyState);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data as { type?: string; state?: WebviewState; error?: string };
      if (message.type === "state" && message.state) {
        setState(message.state);
      }
    }
    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handleMessage);
  }, [vscode]);

  const activeSession = useMemo(() => state.sessions.find((session) => session.id === state.activeSessionId) ?? null, [state.sessions, state.activeSessionId]);

  function setApprovalMode(mode: ApprovalMode) {
    vscode.postMessage({ type: "setApprovalMode", mode });
  }

  return (
    <main className="elysia-app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local-first developer add-on</p>
          <h1>Elysia Coding Room</h1>
        </div>
        <div className={`connection connection--${state.connection.state}`}>
          <span className="icon-dot" /> {state.connection.state}
        </div>
      </header>

      <section className="status-strip">
        <div><strong>API</strong><span>{state.connection.apiUrl}</span></div>
        <div><strong>Workspace</strong><span>{state.workspace.workspaceLabel}</span></div>
        <div><strong>Trust</strong><span>{state.workspace.trustLevel}</span></div>
      </section>

      <div className="layout">
        <SessionList sessions={state.sessions} activeSessionId={state.activeSessionId} onNewSession={() => vscode.postMessage({ type: "newSession" })} onClear={() => vscode.postMessage({ type: "clearSessions" })} />
        <ChatPane activeSession={activeSession} messages={state.messages} onSend={(text) => vscode.postMessage({ type: "sendChatMessage", text })} onRefresh={() => vscode.postMessage({ type: "refreshStatus" })} />
        <aside className="side-stack">
          <ApprovalBar mode={state.approvalMode} onChange={setApprovalMode} />
          <GitStatusPanel git={state.git} />
          <ChangedFilesPanel files={state.changedFiles} />
          <PatchPreview preview={state.patchPreview} />
          <SettingsPanel connection={state.connection} workspace={state.workspace} />
        </aside>
      </div>
    </main>
  );
}
