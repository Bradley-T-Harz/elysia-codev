import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import ApprovalBar from "./components/ApprovalBar";
import ActiveFilePanel from "./components/ActiveFilePanel";
import ChangedFilesPanel from "./components/ChangedFilesPanel";
import CodingBridgePanel from "./components/CodingBridgePanel";
import ChatPane from "./components/ChatPane";
import GitStatusPanel from "./components/GitStatusPanel";
import GoalWorkflowPanel from "./components/GoalWorkflowPanel";
import IdeContextPanel from "./components/IdeContextPanel";
import OperationAuditPanel from "./components/OperationAuditPanel";
import PatchPreview from "./components/PatchPreview";
import ReviewWorkflowPanel from "./components/ReviewWorkflowPanel";
import SessionList from "./components/SessionList";
import SettingsPanel from "./components/SettingsPanel";
import TestOutputPanel from "./components/TestOutputPanel";
import ToolsPanel from "./components/ToolsPanel";
import WorkModePanel from "./components/WorkModePanel";
import type { ApprovalMode, VsCodeApi, WebviewState } from "./types";

type AppProps = { vscode: VsCodeApi };

const emptyState: WebviewState = {
  connection: { state: "unknown", apiUrl: "http://127.0.0.1:8000", summary: "Waiting for extension host." },
  workspace: { trustLevel: "no_workspace", workspaceLabel: "No workspace", workspaceFolders: [], vscodeTrusted: false, trustMode: "vscode_workspace_trust", repoApprovalStatus: "unknown", repoApproved: false, canReadWorkspace: false, canProposePatch: false, canApplyPatch: false, canRunCommand: false },
  activeFile: null,
  sessions: [],
  activeSessionId: null,
  messages: [],
  approvalMode: "plan_only",
  approvalModeCapabilities: {
    canReadApprovedFile: true,
    canInspectPaths: false,
    canProposePatch: false,
    canApplyPatch: false,
    canRunChecks: false,
    description: "Plan only: Elysia may reason and outline changes. No apply-ready patch, mutation, or checks."
  },
  workMode: {
    mode: "local",
    forgeConnected: false,
    forgeStatus: "not_connected",
    selectedContextSendAllowed: false,
    notes: ["Work locally is the default. Developer Forge is not enabled."]
  },
  ideContext: {
    workspaceMetadata: true,
    activeFileMetadata: true,
    approvedFilePreview: true,
    diagnosticsSummary: false,
    selectedChangedFiles: []
  },
  goalWorkflow: {
    status: "idle",
    autonomyEnabled: false,
    pursueGoalEnabled: false,
    fullOperatorEnabled: false,
    notes: ["Pursue Goal and Full Operator Mode are not enabled."]
  },
  git: { branch: "Not inspected", dirtyState: "unknown", changedCount: 0, stagedCount: 0, unstagedCount: 0, untrackedCount: 0, repoDetected: false, approvedRepo: false, status: "not_inspected", summary: "No approved repo inspected." },
  changedFiles: [],
  patchPreview: { state: "empty", summary: "No patch proposed.", files: [], canApply: false },
  coding: { bridge: null, developerProfile: null, commandCatalog: null, repoApproval: { status: "unknown", workspaceLabel: "No workspace", approved: false, revoked: false, rawPathExposed: false }, repoPreview: null, filePreview: null, patchApplyResult: null, commandResult: null, documentOperation: null, dataOperation: null, visualOperation: null, mediaOperation: null, archiveOperation: null, databaseOperation: null, binaryOperation: null, engineeringOperation: null, mediaWorkerTruth: null, fileOperation: null, operationAudits: [] }
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
        <SessionList
          sessions={state.sessions}
          activeSessionId={state.activeSessionId}
          busyAction={state.coding.busyAction}
          onNewSession={() => vscode.postMessage({ type: "newSession" })}
          onSelect={(sessionId) => vscode.postMessage({ type: "selectSession", sessionId })}
          onDelete={(sessionId) => vscode.postMessage({ type: "deleteSession", sessionId })}
          onClear={() => vscode.postMessage({ type: "clearSessions" })}
        />
        <ChatPane
          activeSession={activeSession}
          messages={state.messages}
          busyAction={state.coding.busyAction}
          onSend={(text) => vscode.postMessage({ type: "sendChatMessage", text })}
          onRefresh={() => vscode.postMessage({ type: "refreshStatus" })}
        />
        <aside className="side-stack">
          <ApprovalBar mode={state.approvalMode} capabilities={state.approvalModeCapabilities} onChange={setApprovalMode} />
          <WorkModePanel
            workMode={state.workMode}
            onConnectForge={() => vscode.postMessage({ type: "connectDeveloperForge" })}
            onSendContextToForge={() => vscode.postMessage({ type: "sendSelectedContextToForge" })}
          />
          <IdeContextPanel
            context={state.ideContext}
            onChange={(settings) => vscode.postMessage({ type: "setIdeContext", settings })}
          />
          <GoalWorkflowPanel
            goal={state.goalWorkflow}
            onPlanMode={() => vscode.postMessage({ type: "startPlanMode" })}
            onPlanGoal={(objective, maxSteps, maxMinutes) => vscode.postMessage({ type: "planGoal", objective, maxSteps, maxMinutes })}
            onApproveGoal={() => vscode.postMessage({ type: "approveGoal" })}
            onPursueGoal={() => vscode.postMessage({ type: "pursueGoal" })}
            onStop={() => vscode.postMessage({ type: "stopGoal" })}
            onFullOperator={() => vscode.postMessage({ type: "requestFullOperatorMode" })}
          />
          <CodingBridgePanel coding={state.coding} workspace={state.workspace} onApproveRepo={() => vscode.postMessage({ type: "approveWorkspaceRepo" })} onRevokeRepo={() => vscode.postMessage({ type: "revokeWorkspaceRepo" })} onInspectRepo={() => vscode.postMessage({ type: "inspectRepoPreview" })} onRefresh={() => vscode.postMessage({ type: "refreshStatus" })} />
          <ActiveFilePanel
            activeFile={state.activeFile}
            filePreview={state.coding.filePreview}
            busyAction={state.coding.busyAction}
            canReadWorkspace={state.workspace.canReadWorkspace}
            canMutate={state.approvalModeCapabilities.canApplyPatch}
            onReadPreview={() => vscode.postMessage({ type: "readActiveFilePreview" })}
            fileOperation={state.coding.fileOperation}
            onPlanFileOperation={(operationKind, targetPath, destinationPath, newText) => vscode.postMessage({ type: "planFileOperation", operationKind, targetPath, destinationPath, newText })}
            onApplyFileOperation={() => vscode.postMessage({ type: "applyApprovedFileOperation" })}
            documentOperation={state.coding.documentOperation}
            onInspectDocument={() => vscode.postMessage({ type: "inspectActiveDocument" })}
            onExtractDocument={() => vscode.postMessage({ type: "extractActiveDocument" })}
            onPlanExport={(exportFormat) => vscode.postMessage({ type: "planDocumentExport", exportFormat })}
            onApplyExport={() => vscode.postMessage({ type: "applyApprovedDocumentExport" })}
            onPlanEdit={(operation, parameters) => vscode.postMessage({ type: "planDocumentEdit", operation, parameters })}
            onApplyEdit={() => vscode.postMessage({ type: "applyApprovedDocumentEdit" })}
            dataOperation={state.coding.dataOperation}
            onInspectData={() => vscode.postMessage({ type: "inspectActiveData" })}
            onPreviewData={() => vscode.postMessage({ type: "previewActiveData" })}
            onPlanDataExport={(exportFormat) => vscode.postMessage({ type: "planDataExport", exportFormat })}
            onApplyDataExport={() => vscode.postMessage({ type: "applyApprovedDataExport" })}
            onPlanDataMutation={(operation, parameters) => vscode.postMessage({ type: "planDataMutation", operation, parameters })}
            onApplyDataMutation={() => vscode.postMessage({ type: "applyApprovedDataMutation" })}
            visualOperation={state.coding.visualOperation}
            onInspectVisual={() => vscode.postMessage({ type: "inspectActiveVisual" })}
            onPreviewVisual={() => vscode.postMessage({ type: "previewActiveVisual" })}
            onVisualOcr={() => vscode.postMessage({ type: "runVisualOcr" })}
            onVisualAnalysis={() => vscode.postMessage({ type: "runVisualAnalysis" })}
            onPlanVisualExport={(exportFormat) => vscode.postMessage({ type: "planVisualExport", exportFormat })}
            onApplyVisualExport={() => vscode.postMessage({ type: "applyApprovedVisualExport" })}
            onPlanVisualEdit={(operation, parameters) => vscode.postMessage({ type: "planVisualEdit", operation, parameters })}
            onApplyVisualEdit={() => vscode.postMessage({ type: "applyApprovedVisualEdit" })}
            mediaOperation={state.coding.mediaOperation}
            mediaWorkerTruth={state.coding.mediaWorkerTruth}
            onInspectMedia={() => vscode.postMessage({ type: "inspectActiveMedia" })}
            onThumbnailMedia={() => vscode.postMessage({ type: "thumbnailActiveMedia" })}
            archiveOperation={state.coding.archiveOperation}
            onInspectArchive={() => vscode.postMessage({ type: "inspectActiveArchive" })}
            onPlanArchive={(selectedMemberIndexes) => vscode.postMessage({ type: "planArchiveExtraction", selectedMemberIndexes })}
            onApplyArchive={() => vscode.postMessage({ type: "applyApprovedArchiveExtraction" })}
            databaseOperation={state.coding.databaseOperation}
            binaryOperation={state.coding.binaryOperation}
            engineeringOperation={state.coding.engineeringOperation}
            onInspectDatabase={() => vscode.postMessage({ type: "inspectActiveDatabase" })}
            onPreviewDatabaseSchema={() => vscode.postMessage({ type: "previewActiveDatabaseSchema" })}
            onInspectBinary={() => vscode.postMessage({ type: "inspectActiveBinary" })}
            onInspectEngineering={() => vscode.postMessage({ type: "inspectActiveEngineering" })}
            onPlanEngineeringPreview={() => vscode.postMessage({ type: "planEngineeringPreview" })}
            onApplyEngineeringPreview={() => vscode.postMessage({ type: "applyApprovedEngineeringPreview" })}
          />
          <GitStatusPanel git={state.git} />
          <ChangedFilesPanel files={state.changedFiles} onToggle={(path) => vscode.postMessage({ type: "toggleChangedFileContext", path })} />
          <ReviewWorkflowPanel
            preview={state.patchPreview}
            applyResult={state.coding.patchApplyResult}
            commandResult={state.coding.commandResult}
            onReview={() => vscode.postMessage({ type: "reviewPatchProposal" })}
            onCopyDiff={() => vscode.postMessage({ type: "copyPatchDiff" })}
            onDiscard={() => vscode.postMessage({ type: "discardPatchProposal" })}
          />
          <PatchPreview
            preview={state.patchPreview}
            capabilities={state.approvalModeCapabilities}
            applyResult={state.coding.patchApplyResult}
            busyAction={state.coding.busyAction}
            onApply={() => vscode.postMessage({ type: "applyApprovedPatch" })}
          />
          <TestOutputPanel
            result={state.coding.commandResult}
            catalog={state.coding.commandCatalog}
            capabilities={state.approvalModeCapabilities}
            busyAction={state.coding.busyAction}
            onRun={(commandId) => vscode.postMessage({ type: "runApprovedCheck", commandId })}
          />
          <OperationAuditPanel records={state.coding.operationAudits} />
          <ToolsPanel bridge={state.coding.bridge} catalog={state.coding.commandCatalog} />
          <SettingsPanel connection={state.connection} workspace={state.workspace} developerProfile={state.coding.developerProfile} lastRequestId={state.coding.lastRequestId} />
        </aside>
      </div>
    </main>
  );
}
