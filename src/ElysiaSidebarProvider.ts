import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import { ElysiaApiClient } from "./ElysiaApiClient";
import { FileDiffProvider } from "./FileDiffProvider";
import { SessionStore } from "./SessionStore";
import { WorkspaceTrust } from "./WorkspaceTrust";
import type { ApprovalMode, CodingBridgeStatus, CodingCommandRunResult, CodingDataOperationState, CodingDocumentOperationState, CodingPatchApplyResult, CodingPatchProposal, CodingVisualOperationState, ElysiaMessage, ExtensionToWebviewMessage, FileReadPreview, GoalWorkflowState, IdeContextSettings, PatchPreview, RepoInspectPreview, WebviewState, WebviewToExtensionMessage, WorkModeState } from "./types";

export class ElysiaSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private activeSessionId: string | null = null;
  private codingBridge: CodingBridgeStatus | null = null;
  private repoPreviews = new Map<string, RepoInspectPreview>();
  private filePreviews = new Map<string, FileReadPreview>();
  private documentOperations = new Map<string, CodingDocumentOperationState>();
  private documentEditRequests = new Map<string, { operation: string; parameters: Record<string, unknown> }>();
  private dataOperations = new Map<string, CodingDataOperationState>();
  private dataMutationRequests = new Map<string, { operation: string; parameters: Record<string, unknown> }>();
  private visualOperations = new Map<string, CodingVisualOperationState>();
  private visualEditRequests = new Map<string, { operation: string; parameters: Record<string, unknown> }>();
  private patchProposals = new Map<string, CodingPatchProposal>();
  private patchApplyResults = new Map<string, CodingPatchApplyResult>();
  private commandResults = new Map<string, CodingCommandRunResult>();
  private codingError: string | undefined;
  private busyAction: WebviewState["coding"]["busyAction"];
  private lastAction: string | undefined;
  private workMode: WorkModeState = {
    mode: "local",
    forgeConnected: false,
    forgeStatus: "not_connected",
    selectedContextSendAllowed: false,
    notes: [
      "Work locally is the default and requires no Marketplace or Forge account.",
      "Developer Forge is a future private individual developer account path, not a public community hub.",
      "No selected context is sent outward in this build."
    ]
  };
  private ideContext: IdeContextSettings = {
    workspaceMetadata: true,
    activeFileMetadata: true,
    approvedFilePreview: true,
    diagnosticsSummary: false
  };
  private goalWorkflow: GoalWorkflowState = {
    status: "idle",
    autonomyEnabled: false,
    pursueGoalEnabled: false,
    fullOperatorEnabled: false,
    notes: [
      "Plan mode is available through chat and the approval selector.",
      "Pursue Goal and bounded task loops are visible placeholders until Elysia core policy enables them.",
      "Full Operator Mode is not enabled."
    ]
  };

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: ElysiaApiClient,
    private readonly sessions: SessionStore,
    private readonly approvals: ApprovalController,
    private readonly workspaceTrust: WorkspaceTrust,
    private readonly diffs: FileDiffProvider
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
        vscode.Uri.joinPath(this.context.extensionUri, "webview")
      ]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => void this.handleMessage(message));
  }

  public async refresh(): Promise<void> {
    await this.refreshCodingStatus();
  }

  public async refreshLocalState(): Promise<void> {
    await this.postState();
  }

  public async createSession(): Promise<void> {
    this.busyAction = "newSession";
    this.lastAction = "Creating session...";
    await this.postState();
    const workspace = this.workspaceTrust.getStatus();
    const workspaceRoot = this.getWorkspaceRoot();
    let backendSessionId: string | undefined;
    try {
      backendSessionId = await this.api.startCodingSession({
        workspace_label: workspace.workspaceLabel,
        workspace_root: workspaceRoot,
        approval_mode: this.approvals.getMode()
      });
      this.codingError = undefined;
      this.lastAction = "Backend coding session created.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Unable to start local Elysia coding session.";
      this.lastAction = "Created local UI session only; backend session was unavailable.";
    }
    const session = await this.sessions.newSession(workspace.workspaceLabel, this.approvals.getMode(), backendSessionId);
    this.activeSessionId = session.id;
    this.busyAction = undefined;
    await this.postState();
  }

  public async clearSessions(): Promise<void> {
    this.busyAction = "clearSessions";
    this.lastAction = "Clearing sessions...";
    await this.postState();
    await this.sessions.clear();
    this.activeSessionId = null;
    this.repoPreviews.clear();
    this.filePreviews.clear();
    this.patchProposals.clear();
    this.patchApplyResults.clear();
    this.commandResults.clear();
    this.documentOperations.clear();
    this.dataOperations.clear();
    this.visualOperations.clear();
    this.documentEditRequests.clear();
    this.visualEditRequests.clear();
    this.lastAction = "Local sessions cleared.";
    this.busyAction = undefined;
    await this.postState();
  }

  public async selectSession(sessionId: string): Promise<void> {
    if (!this.sessions.getSessions().some((session) => session.id === sessionId)) return;
    this.activeSessionId = sessionId;
    this.lastAction = "Selected session.";
    await this.postState();
  }

  public async deleteSession(sessionId: string): Promise<void> {
    this.busyAction = "deleteSession";
    this.lastAction = "Deleting session...";
    await this.postState();
    await this.sessions.deleteSession(sessionId);
    this.repoPreviews.delete(sessionId);
    this.filePreviews.delete(sessionId);
    this.documentOperations.delete(sessionId);
    this.dataOperations.delete(sessionId);
    this.visualOperations.delete(sessionId);
    this.documentEditRequests.delete(sessionId);
    this.visualEditRequests.delete(sessionId);
    this.patchProposals.delete(sessionId);
    this.patchApplyResults.delete(sessionId);
    this.commandResults.delete(sessionId);
    const sessions = this.sessions.getSessions();
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = sessions[0]?.id ?? null;
    }
    this.lastAction = "Local session deleted.";
    this.busyAction = undefined;
    await this.postState();
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    if (message.type === "ready") {
      await this.postState();
      return;
    }
    if (message.type === "refreshStatus") {
      await this.refreshCodingStatus();
      return;
    }
    if (message.type === "newSession") {
      await this.createSession();
      return;
    }
    if (message.type === "clearSessions") {
      await this.clearSessions();
      return;
    }
    if (message.type === "selectSession") {
      await this.selectSession(message.sessionId);
      return;
    }
    if (message.type === "deleteSession") {
      await this.deleteSession(message.sessionId);
      return;
    }
    if (message.type === "setApprovalMode") {
      await this.approvals.setMode(message.mode);
      if (this.activeSessionId) {
        await this.sessions.updateSessionApprovalMode(this.activeSessionId, this.approvals.getMode());
      }
      await this.postState();
      return;
    }
    if (message.type === "setIdeContext") {
      this.ideContext = message.settings;
      this.lastAction = "IDE context settings updated.";
      await this.postState();
      return;
    }
    if (message.type === "connectDeveloperForge") {
      await this.connectDeveloperForgePlaceholder();
      return;
    }
    if (message.type === "sendSelectedContextToForge") {
      this.codingError = "Sending selected context to Developer Forge is not enabled yet. No context left this machine.";
      this.lastAction = "Developer Forge send blocked.";
      await this.postState();
      return;
    }
    if (message.type === "requestFullOperatorMode") {
      await this.requestFullOperatorModePlaceholder();
      return;
    }
    if (message.type === "startPlanMode") {
      await this.approvals.setMode("plan_only");
      if (this.activeSessionId) {
        await this.sessions.updateSessionApprovalMode(this.activeSessionId, this.approvals.getMode());
      }
      this.goalWorkflow = { ...this.goalWorkflow, status: "planning", currentGoal: "Plan mode active; use chat to outline the next safe change." };
      this.lastAction = "Plan mode selected.";
      await this.postState();
      return;
    }
    if (message.type === "pursueGoal") {
      this.goalWorkflow = { ...this.goalWorkflow, status: "preview_only", currentGoal: "Pursue Goal is not enabled yet." };
      this.codingError = "Pursue Goal requires a future bounded task-loop contract. No autonomous work started.";
      this.lastAction = "Pursue Goal blocked.";
      await this.postState();
      return;
    }
    if (message.type === "stopGoal") {
      this.goalWorkflow = { ...this.goalWorkflow, status: "stopped", currentGoal: "No autonomous task was running; stop recorded locally." };
      this.lastAction = "Goal workflow stopped.";
      await this.postState();
      return;
    }
    if (message.type === "reviewPatchProposal") {
      await this.reviewPatchProposal();
      return;
    }
    if (message.type === "copyPatchDiff") {
      await this.copyPatchDiff();
      return;
    }
    if (message.type === "discardPatchProposal") {
      this.discardPatchProposal();
      await this.postState();
      return;
    }
    if (message.type === "sendChatMessage") {
      await this.sendChatMessage(message.text);
      return;
    }
    if (message.type === "inspectRepoPreview") {
      await this.inspectRepoPreview();
      return;
    }
    if (message.type === "readActiveFilePreview") {
      await this.readActiveFilePreview();
      return;
    }
    if (message.type === "inspectActiveDocument") {
      await this.inspectActiveDocument();
      return;
    }
    if (message.type === "extractActiveDocument") {
      await this.extractActiveDocument();
      return;
    }
    if (message.type === "planDocumentExport") {
      await this.planDocumentExport(message.exportFormat);
      return;
    }
    if (message.type === "applyApprovedDocumentExport") {
      await this.applyApprovedDocumentExport();
      return;
    }
    if (message.type === "planDocumentEdit") {
      await this.planDocumentEdit(message.operation, message.parameters);
      return;
    }
    if (message.type === "applyApprovedDocumentEdit") {
      await this.applyApprovedDocumentEdit();
      return;
    }
    if (message.type === "inspectActiveData") {
      await this.inspectActiveData();
      return;
    }
    if (message.type === "previewActiveData") {
      await this.previewActiveData();
      return;
    }
    if (message.type === "planDataExport") {
      await this.planDataExport(message.exportFormat);
      return;
    }
    if (message.type === "applyApprovedDataExport") {
      await this.applyApprovedDataExport();
      return;
    }
    if (message.type === "planDataMutation") {
      await this.planDataMutation(message.operation, message.parameters);
      return;
    }
    if (message.type === "applyApprovedDataMutation") {
      await this.applyApprovedDataMutation();
      return;
    }
    if (message.type === "inspectActiveVisual") {
      await this.inspectActiveVisual();
      return;
    }
    if (message.type === "previewActiveVisual") {
      await this.previewActiveVisual();
      return;
    }
    if (message.type === "runVisualOcr") {
      await this.runVisualOcr();
      return;
    }
    if (message.type === "runVisualAnalysis") {
      await this.runVisualAnalysis();
      return;
    }
    if (message.type === "planVisualExport") {
      await this.planVisualExport(message.exportFormat);
      return;
    }
    if (message.type === "applyApprovedVisualExport") {
      await this.applyApprovedVisualExport();
      return;
    }
    if (message.type === "planVisualEdit") {
      await this.planVisualEdit(message.operation, message.parameters);
      return;
    }
    if (message.type === "applyApprovedVisualEdit") {
      await this.applyApprovedVisualEdit();
      return;
    }
    if (message.type === "applyApprovedPatch") {
      await this.applyApprovedPatch();
      return;
    }
    if (message.type === "runApprovedCheck") {
      await this.runApprovedCheck(message.commandId);
    }
  }

  private async sendChatMessage(text: string): Promise<void> {
    if (!text.trim()) return;
    if (!this.activeSessionId) {
      await this.createSession();
    }
    const sessionId = this.activeSessionId;
    if (!sessionId) return;
    this.busyAction = "chat";
    this.lastAction = "Sending chat...";
    await this.postState();
    const userMessage: ElysiaMessage = { id: `msg_${Date.now()}_u`, role: "user", text: text.trim(), createdAt: new Date().toISOString() };
    await this.sessions.appendMessage(sessionId, userMessage);
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    const approvedFilePreview = this.filePreviews.get(sessionId);
    const hasApprovedFilePreview = approvedFilePreview?.status === "completed";
    const needsFileContext = this.looksLikePatchOrFileChangeRequest(text);
    let reply: string;
    try {
      const chatReply = await this.api.sendCodingChat({
        session_id: session?.backendSessionId,
        message: text.trim(),
        workspace_label: session?.workspaceLabel,
        approval_mode: this.approvals.getMode(),
        approved_file_context: this.ideContext.approvedFilePreview ? this.toApprovedFileContext(approvedFilePreview) : undefined
      });
      reply = chatReply.assistantText;
      if (chatReply.patchProposal) {
        this.patchProposals.set(sessionId, chatReply.patchProposal);
      }
      if (needsFileContext && !hasApprovedFilePreview) {
        reply = `${reply}\n\nApprove file preview first before asking Elysia to propose a patch for the active file. Codev has not sent source contents yet.`;
      } else if (needsFileContext && hasApprovedFilePreview && !this.ideContext.approvedFilePreview) {
        reply = `${reply}\n\nApproved file preview context is currently excluded by the IDE Context toggle, so Codev did not send source contents with this chat request.`;
      }
      this.codingError = undefined;
      this.lastAction = "Chat response received.";
    } catch (error) {
      reply = `Local Elysia coding bridge unavailable. Your message stayed inside the VS Code companion shell: ${error instanceof Error ? error.message : text.trim()}`;
      this.codingError = error instanceof Error ? error.message : "Local Elysia coding bridge unavailable.";
      this.lastAction = "Chat stayed local in the VS Code shell.";
    }
    const elysiaMessage: ElysiaMessage = { id: `msg_${Date.now()}_e`, role: "elysia", text: reply, createdAt: new Date().toISOString() };
    await this.sessions.appendMessage(sessionId, elysiaMessage);
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectRepoPreview(): Promise<void> {
    if (!this.activeSessionId) {
      await this.createSession();
    }
    const activeSessionId = this.activeSessionId;
    if (!activeSessionId) return;
    if (!this.approvals.canInspectPaths()) {
      this.codingError = "Repo preview requires path preview, apply with approval, or test with approval mode.";
      this.lastAction = "Repo preview blocked by approval mode.";
      await this.postState();
      return;
    }
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.codingError = "No trusted workspace folder is available for repo preview.";
      await this.postState();
      return;
    }
    this.busyAction = "repoPreview";
    this.lastAction = "Inspecting repo metadata preview...";
    await this.postState();
    const session = this.sessions.getSessions().find((item) => item.id === this.activeSessionId);
    try {
      const preview = await this.api.inspectRepoPreview({
        workspace_root: workspaceRoot,
        session_id: session?.backendSessionId,
        max_depth: 3,
        max_entries: 80
      });
      this.repoPreviews.set(activeSessionId, preview);
      this.codingError = undefined;
      this.lastAction = "Repo metadata preview updated.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Repo preview failed.";
      this.lastAction = "Repo preview failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async readActiveFilePreview(): Promise<void> {
    if (!this.activeSessionId) {
      await this.createSession();
    }
    const activeSessionId = this.activeSessionId;
    if (!activeSessionId) return;
    const workspaceRoot = this.diffs.getActiveFileWorkspaceRoot() ?? this.getWorkspaceRoot();
    const activeFilePath = this.diffs.getActiveFilePath();
    if (!workspaceRoot || !activeFilePath) {
      this.codingError = "No file-backed editor active. Open a file such as fibonacci_bug.py first.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      "Allow Elysia to read a bounded preview of the active file? Private/generated/secret paths remain blocked.",
      { modal: true },
      "Allow bounded preview"
    );
    if (approval !== "Allow bounded preview") {
      this.codingError = "Selected file preview was not approved.";
      this.lastAction = "File preview cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "filePreview";
    this.lastAction = "Reading approved selected-file preview...";
    await this.postState();
    const session = this.sessions.getSessions().find((item) => item.id === activeSessionId);
    try {
      const preview = await this.api.readSelectedFilePreview({
        workspace_root: workspaceRoot,
        file_path: activeFilePath,
        session_id: session?.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      this.filePreviews.set(activeSessionId, preview);
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = preview.status === "completed" ? "Selected-file preview updated." : "Selected-file preview blocked.";
      if (preview.status === "completed") {
        this.patchProposals.delete(activeSessionId);
        this.patchApplyResults.delete(activeSessionId);
        if (preview.category !== "document") this.documentOperations.delete(activeSessionId);
        if (preview.category !== "science_data" && preview.adapter !== "data") this.dataOperations.delete(activeSessionId);
        if (preview.category !== "visual") this.visualOperations.delete(activeSessionId);
      }
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Selected-file preview failed.";
      this.lastAction = "Selected-file preview failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private getDocumentOperation(sessionId: string): CodingDocumentOperationState {
    const existing = this.documentOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingDocumentOperationState = {
      inspectPreview: null,
      extractPreview: null,
      exportPlan: null,
      editPlan: null,
      applyResult: null
    };
    this.documentOperations.set(sessionId, created);
    return created;
  }

  private getActiveDocumentContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.diffs.getActiveFileWorkspaceRoot() ?? this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed document in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "document") return { error: "Read an approved preview of a supported document first." };
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private async inspectActiveDocument(): Promise<void> {
    const context = this.getActiveDocumentContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "documentInspect";
    this.lastAction = "Inspecting document metadata...";
    await this.postState();
    try {
      const preview = await this.api.inspectDocument({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      const operation = this.getDocumentOperation(context.sessionId);
      this.documentOperations.set(context.sessionId, { ...operation, inspectPreview: preview, lastError: undefined });
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = "Document inspect completed.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Document inspect failed.";
      this.documentOperations.set(context.sessionId, { ...this.getDocumentOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Document inspect failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async extractActiveDocument(): Promise<void> {
    const context = this.getActiveDocumentContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "documentExtract";
    this.lastAction = "Extracting bounded document preview...";
    await this.postState();
    try {
      const preview = await this.api.extractDocumentPreview({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        max_chars: 12000,
        max_tables: 8,
        max_rows: 20
      });
      const operation = this.getDocumentOperation(context.sessionId);
      this.documentOperations.set(context.sessionId, { ...operation, extractPreview: preview, lastError: undefined });
      this.filePreviews.set(context.sessionId, preview);
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = "Document extract preview updated.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Document extraction failed.";
      this.documentOperations.set(context.sessionId, { ...this.getDocumentOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Document extraction failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planDocumentExport(exportFormat: "markdown" | "text"): Promise<void> {
    const context = this.getActiveDocumentContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const preview = this.filePreviews.get(context.sessionId);
    const relative = preview?.relative_path ?? preview?.file_label ?? "document";
    const suffix = exportFormat === "markdown" ? "md" : "txt";
    this.busyAction = "documentExportPlan";
    this.lastAction = "Planning document export...";
    await this.postState();
    try {
      const plan = await this.api.planDocumentExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        export_format: exportFormat,
        target_path: `${relative}.export.${suffix}`
      });
      const operation = this.getDocumentOperation(context.sessionId);
      this.documentOperations.set(context.sessionId, { ...operation, exportPlan: plan, applyResult: null, lastError: undefined });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = "Document export plan ready.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Document export planning failed.";
      this.documentOperations.set(context.sessionId, { ...this.getDocumentOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Document export planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedDocumentExport(): Promise<void> {
    const context = this.getActiveDocumentContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getDocumentOperation(context.sessionId);
    const plan = operation.exportPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan a document export before approving export.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Write approved document export to ${plan.target_relative_path}? Source document is not modified.`,
      { modal: true },
      "Approve document export"
    );
    if (approval !== "Approve document export") {
      this.lastAction = "Document export cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "documentExportApply";
    this.lastAction = "Applying approved document export...";
    await this.postState();
    try {
      const format = plan.target_relative_path?.endsWith(".txt") ? "text" : "markdown";
      const result = await this.api.applyApprovedDocumentExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        export_format: format,
        target_path: plan.target_relative_path,
        expected_source_hash: plan.source_hash,
        overwrite_existing: false
      });
      this.documentOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Document export ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Document export failed.";
      this.documentOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Document export failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planDocumentEdit(operationName: string, parameters: Record<string, unknown>): Promise<void> {
    const context = this.getActiveDocumentContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "documentEditPlan";
    this.lastAction = "Planning stable document edit...";
    await this.postState();
    try {
      const plan = await this.api.planDocumentEdit({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        operation: operationName,
        parameters
      });
      const operation = this.getDocumentOperation(context.sessionId);
      this.documentOperations.set(context.sessionId, { ...operation, editPlan: plan, applyResult: null, lastError: undefined });
      this.documentEditRequests.set(context.sessionId, { operation: operationName, parameters });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = `Document edit plan ${plan.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Document edit planning failed.";
      this.documentOperations.set(context.sessionId, { ...this.getDocumentOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Document edit planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedDocumentEdit(): Promise<void> {
    const context = this.getActiveDocumentContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getDocumentOperation(context.sessionId);
    const plan = operation.editPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan a stable document edit before approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Apply approved stable document edit to ${plan.relative_path ?? plan.file_label}?`,
      { modal: true },
      "Approve document edit"
    );
    if (approval !== "Approve document edit") {
      this.lastAction = "Document edit cancelled.";
      await this.postState();
      return;
    }
    const request = this.documentEditRequests.get(context.sessionId);
    if (!request) {
      this.codingError = "Document edit request details are missing. Re-plan the edit before applying.";
      await this.postState();
      return;
    }
    this.busyAction = "documentEditApply";
    this.lastAction = "Applying approved document edit...";
    await this.postState();
    try {
      const result = await this.api.applyApprovedDocumentEdit({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        operation: request.operation,
        parameters: request.parameters,
        expected_source_hash: plan.source_hash
      });
      this.documentOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Document edit ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Document edit failed.";
      this.documentOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Document edit failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private getDataOperation(sessionId: string): CodingDataOperationState {
    const existing = this.dataOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingDataOperationState = {
      inspectPreview: null,
      extractPreview: null,
      exportPlan: null,
      mutationPlan: null,
      applyResult: null
    };
    this.dataOperations.set(sessionId, created);
    return created;
  }

  private getVisualOperation(sessionId: string): CodingVisualOperationState {
    const existing = this.visualOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingVisualOperationState = {
      inspectPreview: null,
      extractPreview: null,
      ocrResult: null,
      analysisResult: null,
      exportPlan: null,
      editPlan: null,
      applyResult: null
    };
    this.visualOperations.set(sessionId, created);
    return created;
  }

  private getActiveDataContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.diffs.getActiveFileWorkspaceRoot() ?? this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed data file in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "science_data" && preview?.adapter !== "data") {
      return { error: "Read an approved preview of a supported science/data file first." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private async inspectActiveData(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "dataInspect";
    this.lastAction = "Inspecting data metadata...";
    await this.postState();
    try {
      const preview = await this.api.inspectData({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      const operation = this.getDataOperation(context.sessionId);
      this.dataOperations.set(context.sessionId, { ...operation, inspectPreview: preview, lastError: undefined });
      this.codingError = preview.status === "completed" || preview.status === "reduced_dependency_missing" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = "Data inspect completed.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data inspect failed.";
      this.dataOperations.set(context.sessionId, { ...this.getDataOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Data inspect failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async previewActiveData(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "dataPreview";
    this.lastAction = "Building bounded data preview...";
    await this.postState();
    try {
      const preview = await this.api.previewData({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        max_rows: 50,
        max_features: 25,
        max_values: 100
      });
      const operation = this.getDataOperation(context.sessionId);
      this.dataOperations.set(context.sessionId, { ...operation, extractPreview: preview, lastError: undefined });
      this.filePreviews.set(context.sessionId, preview);
      this.codingError = preview.status === "completed" || preview.status === "reduced_dependency_missing" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = "Data preview updated.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data preview failed.";
      this.dataOperations.set(context.sessionId, { ...this.getDataOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Data preview failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planDataExport(exportFormat: "markdown" | "json"): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const preview = this.filePreviews.get(context.sessionId);
    const relative = preview?.relative_path ?? preview?.file_label ?? "data";
    const suffix = exportFormat === "markdown" ? "md" : "json";
    this.busyAction = "dataExportPlan";
    this.lastAction = "Planning data export...";
    await this.postState();
    try {
      const plan = await this.api.planDataExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        export_format: exportFormat,
        target_path: `${relative}.data-export.${suffix}`
      });
      const operation = this.getDataOperation(context.sessionId);
      this.dataOperations.set(context.sessionId, { ...operation, exportPlan: plan, applyResult: null, lastError: undefined });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = "Data export plan ready.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data export planning failed.";
      this.dataOperations.set(context.sessionId, { ...this.getDataOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Data export planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedDataExport(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getDataOperation(context.sessionId);
    const plan = operation.exportPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan a data export before approving export.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Write approved data export to ${plan.target_relative_path}? Source dataset is not modified.`,
      { modal: true },
      "Approve data export"
    );
    if (approval !== "Approve data export") {
      this.lastAction = "Data export cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "dataExportApply";
    this.lastAction = "Applying approved data export...";
    await this.postState();
    try {
      const format = plan.target_relative_path?.endsWith(".json") ? "json" : "markdown";
      const result = await this.api.applyApprovedDataExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        export_format: format,
        target_path: plan.target_relative_path,
        expected_source_hash: plan.source_hash,
        overwrite_existing: false
      });
      this.dataOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Data export ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data export failed.";
      this.dataOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Data export failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planDataMutation(operationName: string, parameters: Record<string, unknown>): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "dataMutationPlan";
    this.lastAction = "Planning governed data mutation...";
    await this.postState();
    try {
      const plan = await this.api.planDataMutation({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        operation: operationName,
        parameters
      });
      const operation = this.getDataOperation(context.sessionId);
      this.dataOperations.set(context.sessionId, { ...operation, mutationPlan: plan, applyResult: null, lastError: undefined });
      this.dataMutationRequests.set(context.sessionId, { operation: operationName, parameters });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = `Data mutation plan ${plan.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data mutation planning failed.";
      this.dataOperations.set(context.sessionId, { ...this.getDataOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Data mutation planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedDataMutation(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getDataOperation(context.sessionId);
    const plan = operation.mutationPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan a governed data mutation before approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Apply approved data mutation to ${plan.relative_path ?? plan.file_label}? A backup/transaction will be used where required.`,
      { modal: true },
      "Approve data mutation"
    );
    if (approval !== "Approve data mutation") {
      this.lastAction = "Data mutation cancelled.";
      await this.postState();
      return;
    }
    const request = this.dataMutationRequests.get(context.sessionId);
    if (!request) {
      this.codingError = "Data mutation request details are missing. Re-plan the mutation before applying.";
      await this.postState();
      return;
    }
    this.busyAction = "dataMutationApply";
    this.lastAction = "Applying approved data mutation...";
    await this.postState();
    try {
      const result = await this.api.applyApprovedDataMutation({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        operation: request.operation,
        parameters: request.parameters,
        expected_source_hash: plan.source_hash
      });
      this.dataOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Data mutation ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data mutation failed.";
      this.dataOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Data mutation failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveVisual(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "visualInspect";
    this.lastAction = "Inspecting visual file...";
    await this.postState();
    try {
      const preview = await this.api.inspectVisual({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      const operation = this.getVisualOperation(context.sessionId);
      this.visualOperations.set(context.sessionId, { ...operation, inspectPreview: preview, lastError: undefined });
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = `Visual inspection ${preview.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual inspection failed.";
      this.visualOperations.set(context.sessionId, { ...this.getVisualOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Visual inspection failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async previewActiveVisual(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "visualPreview";
    this.lastAction = "Creating approved visual preview...";
    await this.postState();
    try {
      const preview = await this.api.previewVisual({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      const operation = this.getVisualOperation(context.sessionId);
      this.visualOperations.set(context.sessionId, { ...operation, extractPreview: preview, lastError: undefined });
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = `Visual preview ${preview.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual preview failed.";
      this.visualOperations.set(context.sessionId, { ...this.getVisualOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Visual preview failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async runVisualOcr(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "visualOcr";
    this.lastAction = "Running approved local OCR...";
    await this.postState();
    try {
      const result = await this.api.runVisualOcr({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        max_chars: 1200
      });
      const operation = this.getVisualOperation(context.sessionId);
      this.visualOperations.set(context.sessionId, { ...operation, ocrResult: result, lastError: undefined });
      this.codingError = String(result.status ?? "") === "completed" ? undefined : String(result.blocked_reason ?? result.status ?? "");
      this.lastAction = `Visual OCR ${String(result.status ?? "returned")}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual OCR failed.";
      this.visualOperations.set(context.sessionId, { ...this.getVisualOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Visual OCR failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async runVisualAnalysis(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "visualAnalysis";
    this.lastAction = "Running local visual analysis...";
    await this.postState();
    try {
      const result = await this.api.analyzeVisual({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        include_semantic_provider: true
      });
      const operation = this.getVisualOperation(context.sessionId);
      this.visualOperations.set(context.sessionId, { ...operation, analysisResult: result, lastError: undefined });
      this.codingError = String(result.status ?? "") === "completed" ? undefined : String(result.blocked_reason ?? result.status ?? "");
      this.lastAction = `Visual analysis ${String(result.status ?? "returned")}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual analysis failed.";
      this.visualOperations.set(context.sessionId, { ...this.getVisualOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Visual analysis failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planVisualExport(exportFormat: "markdown" | "json" | "png" | "jpg" | "webp" | "tiff" | "svg"): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const fileName = context.filePath.split(/[\\/]/).pop() ?? "visual";
    const suffix = exportFormat === "markdown" ? "md" : exportFormat;
    this.busyAction = "visualExportPlan";
    this.lastAction = "Planning visual export...";
    await this.postState();
    try {
      const plan = await this.api.planVisualExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        export_format: exportFormat,
        target_path: `${fileName}.visual-export.${suffix}`
      });
      const operation = this.getVisualOperation(context.sessionId);
      this.visualOperations.set(context.sessionId, { ...operation, exportPlan: plan, applyResult: null, lastError: undefined });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = `Visual export plan ${plan.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual export planning failed.";
      this.visualOperations.set(context.sessionId, { ...this.getVisualOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Visual export planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedVisualExport(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getVisualOperation(context.sessionId);
    const plan = operation.exportPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan a visual export before approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Write derived visual export ${plan.target_relative_path ?? ""}? Source visual remains unchanged.`,
      { modal: true },
      "Approve visual export"
    );
    if (approval !== "Approve visual export") {
      this.lastAction = "Visual export cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "visualExportApply";
    this.lastAction = "Applying approved visual export...";
    await this.postState();
    try {
      const exportFormat = String(plan.operation_details?.export_format ?? "markdown") as "markdown" | "json" | "png" | "jpg" | "webp" | "tiff" | "svg";
      const result = await this.api.applyApprovedVisualExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        export_format: exportFormat,
        target_path: plan.target_relative_path,
        expected_source_hash: plan.source_hash
      });
      this.visualOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Visual export ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual export failed.";
      this.visualOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Visual export failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planVisualEdit(operationName: string, parameters: Record<string, unknown>): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "visualEditPlan";
    this.lastAction = "Planning visual edit...";
    await this.postState();
    try {
      const plan = await this.api.planVisualEdit({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode",
        operation: operationName,
        parameters
      });
      const operation = this.getVisualOperation(context.sessionId);
      this.visualOperations.set(context.sessionId, { ...operation, editPlan: plan, applyResult: null, lastError: undefined });
      this.visualEditRequests.set(context.sessionId, { operation: operationName, parameters });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = `Visual edit plan ${plan.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual edit planning failed.";
      this.visualOperations.set(context.sessionId, { ...this.getVisualOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Visual edit planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedVisualEdit(): Promise<void> {
    const context = this.getActiveDataContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getVisualOperation(context.sessionId);
    const plan = operation.editPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan a governed visual edit before approval.";
      await this.postState();
      return;
    }
    const request = this.visualEditRequests.get(context.sessionId);
    if (!request) {
      this.codingError = "Visual edit request details are missing. Re-plan the edit before applying.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Write derived visual edit ${plan.target_relative_path ?? ""}? Source visual remains unchanged.`,
      { modal: true },
      "Approve visual edit"
    );
    if (approval !== "Approve visual edit") {
      this.lastAction = "Visual edit cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "visualEditApply";
    this.lastAction = "Applying approved visual edit...";
    await this.postState();
    try {
      const result = await this.api.applyApprovedVisualEdit({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        operation: request.operation,
        parameters: request.parameters,
        expected_source_hash: plan.source_hash
      });
      this.visualOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Visual edit ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual edit failed.";
      this.visualOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Visual edit failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedPatch(): Promise<void> {
    const sessionId = this.activeSessionId;
    if (!sessionId) return;
    if (!this.approvals.canApplyPatch()) {
      this.codingError = "Patch apply requires apply with approval or test with approval mode.";
      this.lastAction = "Patch apply blocked by approval mode.";
      await this.postState();
      return;
    }
    const proposal = this.patchProposals.get(sessionId);
    const preview = this.filePreviews.get(sessionId);
    const workspaceRoot = this.diffs.getActiveFileWorkspaceRoot() ?? this.getWorkspaceRoot();
    if (!proposal || !preview || !workspaceRoot || !proposal.diff_preview || !preview.content_hash) {
      this.codingError = "Approve a file preview and request a patch proposal before applying.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Apply preview-only patch to ${preview.relative_path ?? preview.file_label}? This will modify one workspace text file.`,
      { modal: true },
      "Apply approved patch"
    );
    if (approval !== "Apply approved patch") {
      this.lastAction = "Patch apply cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "applyPatch";
    this.lastAction = "Applying approved patch...";
    await this.postState();
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    try {
      const result = await this.api.applyApprovedPatch({
        session_id: session?.backendSessionId,
        approval_mode: this.approvals.getMode(),
        workspace_root: workspaceRoot,
        target_file: preview.relative_path ?? preview.file_label,
        proposed_diff: proposal.diff_preview,
        expected_content_hash: proposal.expected_content_hash ?? preview.content_hash,
        patch_hash: proposal.patch_hash,
        operator_approved: true,
        approval_phrase: "Apply approved patch"
      });
      this.patchApplyResults.set(sessionId, result);
      this.codingError = result.mutation_performed ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = result.mutation_performed ? "Approved patch applied." : "Patch apply blocked.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Patch apply failed.";
      this.lastAction = "Patch apply failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async runApprovedCheck(commandId: string): Promise<void> {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    if (!this.approvals.canRunCommand()) {
      this.codingError = "Approved checks require test with approval mode.";
      this.lastAction = "Approved check blocked by approval mode.";
      await this.postState();
      return;
    }
    if (!sessionId || !workspaceRoot) {
      this.codingError = "Open a trusted workspace before running an approved check.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Run approved allowlisted check "${commandId}" in this workspace?`,
      { modal: true },
      "Run approved check"
    );
    if (approval !== "Run approved check") {
      this.lastAction = "Approved check cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "runCheck";
    this.lastAction = "Running approved check...";
    await this.postState();
    try {
      const result = await this.api.runApprovedCommand({
        approval_id: `codev_${Date.now().toString(36)}`,
        approval_mode: this.approvals.getMode(),
        command_id: commandId,
        workspace_root: workspaceRoot,
        operator_approved: true
      });
      this.commandResults.set(sessionId, result);
      this.codingError = result.status === "completed" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Approved check ${result.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Approved check failed.";
      this.lastAction = "Approved check failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async refreshCodingStatus(): Promise<void> {
    this.busyAction = "refresh";
    this.lastAction = "Refreshing coding bridge...";
    await this.postState();
    try {
      this.codingBridge = await this.api.getCodingStatus();
      this.codingError = undefined;
      this.lastAction = "Coding bridge refreshed.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Local Elysia coding bridge unavailable.";
      this.lastAction = "Coding bridge refresh failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async connectDeveloperForgePlaceholder(): Promise<void> {
    const approval = await vscode.window.showInformationMessage(
      "Developer Forge is planned as a private individual developer account. This build will not upload code, secrets, paths, or selected context.",
      { modal: true },
      "Acknowledge"
    );
    if (approval === "Acknowledge") {
      this.workMode = {
        ...this.workMode,
        mode: "local",
        forgeConnected: false,
        forgeStatus: "placeholder",
        selectedContextSendAllowed: false
      };
      this.lastAction = "Developer Forge is not enabled yet; Codev stayed local.";
      this.codingError = undefined;
    }
    await this.postState();
  }

  private async requestFullOperatorModePlaceholder(): Promise<void> {
    const confirmation = await vscode.window.showInputBox({
      prompt: "Full Operator Mode is not enabled. To acknowledge the blocked future authority, type: FULL OPERATOR NOT ENABLED",
      placeHolder: "FULL OPERATOR NOT ENABLED",
      ignoreFocusOut: true
    });
    if (confirmation === "FULL OPERATOR NOT ENABLED") {
      await vscode.window.showWarningMessage(
        "Full Operator Mode remains disabled. Future enablement would still be governed by Elysia core policy, blocked paths, approval gates, and audit logs.",
        { modal: true }
      );
      this.goalWorkflow = { ...this.goalWorkflow, status: "preview_only", currentGoal: "Full Operator Mode requested but not enabled." };
      this.lastAction = "Full Operator Mode remains disabled.";
      this.codingError = undefined;
    } else if (confirmation) {
      this.codingError = "Full Operator Mode acknowledgement did not match. Nothing changed.";
      this.lastAction = "Full Operator Mode request cancelled.";
    }
    await this.postState();
  }

  private async buildState(): Promise<WebviewState> {
    const sessions = this.sessions.getSessions();
    if (!this.activeSessionId && sessions[0]) {
      this.activeSessionId = sessions[0].id;
    }
    const connection = this.codingBridge
      ? {
          state: "connected" as const,
          apiUrl: this.api.apiUrl.replace(/\/$/, ""),
          summary: `Local Elysia coding bridge reachable (${this.codingBridge.contract_version}).`,
          checkedAt: new Date().toISOString()
        }
      : await this.api.getStatus();
    if (!this.codingBridge && connection.state === "connected") {
      try {
        this.codingBridge = await this.api.getCodingStatus();
        this.codingError = undefined;
      } catch (error) {
        this.codingError = error instanceof Error ? error.message : "Local Elysia coding bridge unavailable.";
      }
    }
    const activePreview = this.activeSessionId ? this.repoPreviews.get(this.activeSessionId) ?? null : null;
    const activeFilePreview = this.activeSessionId ? this.filePreviews.get(this.activeSessionId) ?? null : null;
    return {
      connection,
      workspace: this.workspaceTrust.getStatus(),
      activeFile: this.diffs.getActiveFile(),
      sessions,
      activeSessionId: this.activeSessionId,
      messages: this.sessions.getMessages(this.activeSessionId),
      approvalMode: this.approvals.getMode(),
      approvalModeCapabilities: this.approvals.getCapabilities(),
      workMode: this.workMode,
      ideContext: this.ideContext,
      goalWorkflow: this.goalWorkflow,
      git: this.diffs.getGitStatusSummary(),
      changedFiles: this.diffs.getChangedFiles(),
      patchPreview: this.getPatchPreviewForSession(this.activeSessionId),
      coding: {
        bridge: this.codingBridge,
        repoPreview: activePreview,
        filePreview: activeFilePreview,
        patchApplyResult: this.activeSessionId ? this.patchApplyResults.get(this.activeSessionId) ?? null : null,
        commandResult: this.activeSessionId ? this.commandResults.get(this.activeSessionId) ?? null : null,
        documentOperation: this.activeSessionId ? this.documentOperations.get(this.activeSessionId) ?? null : null,
        dataOperation: this.activeSessionId ? this.dataOperations.get(this.activeSessionId) ?? null : null,
        visualOperation: this.activeSessionId ? this.visualOperations.get(this.activeSessionId) ?? null : null,
        lastError: this.codingError,
        busyAction: this.busyAction,
        lastAction: this.lastAction
      }
    };
  }

  private getWorkspaceRoot(): string | undefined {
    if (!vscode.workspace.isTrusted) return undefined;
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private looksLikePatchOrFileChangeRequest(text: string): boolean {
    const lowered = text.toLowerCase();
    return /\b(patch|diff|fix|edit|change|modify|rewrite|replace|bug)\b/.test(lowered);
  }

  private toApprovedFileContext(preview: FileReadPreview | undefined): Parameters<ElysiaApiClient["sendCodingChat"]>[0]["approved_file_context"] {
    if (!preview || preview.status !== "completed" || !preview.source_contents_included || !preview.content_preview) {
      return undefined;
    }
    return {
      file_label: preview.file_label,
      relative_path: preview.relative_path ?? preview.file_label,
      language_hint: preview.language_hint,
      path_hash: preview.path_hash,
      content_preview: preview.content_preview,
      source_contents_included: true,
      approval_granted: true
    };
  }

  private getPatchPreviewForSession(sessionId: string | null): PatchPreview {
    if (!sessionId) return this.diffs.getPatchPreview();
    const proposal = this.patchProposals.get(sessionId);
    if (!proposal) return this.diffs.getPatchPreview();
    return {
      state: "available",
      summary: proposal.change_summary,
      files: proposal.allowed_target_files.length ? proposal.allowed_target_files : proposal.target_files,
      canApply: this.approvals.canApplyPatch() && Boolean(proposal.diff_preview),
      diffPreview: proposal.diff_preview,
      patchHash: proposal.patch_hash,
      warnings: proposal.warnings
    };
  }

  private getActivePatchProposal(): CodingPatchProposal | undefined {
    if (!this.activeSessionId) return undefined;
    return this.patchProposals.get(this.activeSessionId);
  }

  private async reviewPatchProposal(): Promise<void> {
    const proposal = this.getActivePatchProposal();
    if (!proposal) {
      this.codingError = "No patch proposal is available to review.";
      this.lastAction = "Review unavailable.";
      await this.postState();
      return;
    }
    const files = proposal.allowed_target_files.length ? proposal.allowed_target_files : proposal.target_files;
    await vscode.window.showInformationMessage(
      `Patch proposal: ${proposal.change_summary}\nFiles: ${files.join(", ") || "none"}\nPatch hash: ${proposal.patch_hash}\nApply allowed by proposal: ${proposal.apply_allowed ? "yes, with approval" : "no"}`,
      { modal: true },
      "OK"
    );
    this.lastAction = "Patch proposal reviewed.";
    this.codingError = undefined;
    await this.postState();
  }

  private async copyPatchDiff(): Promise<void> {
    const proposal = this.getActivePatchProposal();
    if (!proposal?.diff_preview) {
      this.codingError = "No patch diff is available to copy.";
      this.lastAction = "Copy diff unavailable.";
      await this.postState();
      return;
    }
    await vscode.env.clipboard.writeText(proposal.diff_preview);
    this.lastAction = "Patch diff copied to clipboard.";
    this.codingError = undefined;
    await this.postState();
  }

  private discardPatchProposal(): void {
    if (!this.activeSessionId) return;
    this.patchProposals.delete(this.activeSessionId);
    this.patchApplyResults.delete(this.activeSessionId);
    this.lastAction = "Patch proposal discarded locally.";
  }

  private async postState(): Promise<void> {
    if (!this.view) return;
    const payload: ExtensionToWebviewMessage = { type: "state", state: await this.buildState() };
    await this.view.webview.postMessage(payload);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "webview", "styles.css"));
    const codiconSafeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "codicon-safe.css"));
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`
    ].join("; ");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${codiconSafeUri}" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Elysia Coding Room</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
