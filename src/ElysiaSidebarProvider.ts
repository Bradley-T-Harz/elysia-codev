import * as vscode from "vscode";
import * as path from "node:path";
import { ApprovalController } from "./ApprovalController";
import { ElysiaApiClient } from "./ElysiaApiClient";
import { FileDiffProvider } from "./FileDiffProvider";
import { SessionStore } from "./SessionStore";
import { WorkspaceTrust } from "./WorkspaceTrust";
import type { ApprovalMode, CodingArchiveOperationState, CodingBinaryOperationState, CodingBridgeStatus, CodingCommandRunResult, CodingDataOperationState, CodingDatabaseOperationState, CodingDocumentOperationState, CodingEngineeringOperationState, CodingFileOperationState, CodingMediaOperationState, CodingOperationAudit, CodingPatchApplyResult, CodingPatchProposal, CodingVisualOperationState, CommandCatalog, DeveloperProfileStatus, ElysiaConnectionStatus, ElysiaMessage, ExtensionToWebviewMessage, FileReadPreview, GoalWorkflowState, IdeContextSettings, MediaWorkerTruth, PatchPreview, RepoApprovalStatus, RepoInspectPreview, WebviewState, WebviewToExtensionMessage, WorkModeState } from "./types";

const UNKNOWN_REPO_APPROVAL: RepoApprovalStatus = {
  status: "unknown",
  workspaceLabel: "No workspace",
  approved: false,
  revoked: false,
  rawPathExposed: false
};

export class ElysiaSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private activeSessionId: string | null = null;
  private codingBridge: CodingBridgeStatus | null = null;
  private connectionStatus: ElysiaConnectionStatus | null = null;
  private developerProfile: DeveloperProfileStatus | null = null;
  private commandCatalog: CommandCatalog | null = null;
  private repoApproval: RepoApprovalStatus = UNKNOWN_REPO_APPROVAL;
  private mediaWorkerTruth: MediaWorkerTruth | null = null;
  private repoPreviews = new Map<string, RepoInspectPreview>();
  private filePreviews = new Map<string, FileReadPreview>();
  private documentOperations = new Map<string, CodingDocumentOperationState>();
  private documentEditRequests = new Map<string, { operation: string; parameters: Record<string, unknown> }>();
  private dataOperations = new Map<string, CodingDataOperationState>();
  private dataMutationRequests = new Map<string, { operation: string; parameters: Record<string, unknown> }>();
  private visualOperations = new Map<string, CodingVisualOperationState>();
  private mediaOperations = new Map<string, CodingMediaOperationState>();
  private archiveOperations = new Map<string, CodingArchiveOperationState>();
  private databaseOperations = new Map<string, CodingDatabaseOperationState>();
  private binaryOperations = new Map<string, CodingBinaryOperationState>();
  private engineeringOperations = new Map<string, CodingEngineeringOperationState>();
  private visualEditRequests = new Map<string, { operation: string; parameters: Record<string, unknown> }>();
  private fileOperations = new Map<string, CodingFileOperationState>();
  private fileOperationRequests = new Map<string, { operationKind: "create" | "edit" | "replace" | "delete" | "rename" | "move"; targetPath: string; destinationPath?: string; newText?: string }>();
  private patchProposals = new Map<string, CodingPatchProposal>();
  private patchApplyResults = new Map<string, CodingPatchApplyResult>();
  private commandResults = new Map<string, CodingCommandRunResult>();
  private operationAudits: CodingOperationAudit[] = [];
  private codingError: string | undefined;
  private busyAction: WebviewState["coding"]["busyAction"];
  private lastAction: string | undefined;
  private lastRequestId: string | undefined;
  private contextReceipt: WebviewState["coding"]["contextReceipt"];
  private goalTaskToken: string | undefined;
  private workMode: WorkModeState = {
    mode: "local",
    forgeConnected: false,
    forgeStatus: "not_connected",
    selectedContextSendAllowed: false,
    notes: [
      "Work locally is the default and requires no Marketplace or Forge account.",
      "External context transfer is disabled.",
      "No selected context leaves the authenticated local bridge."
    ]
  };
  private ideContext: IdeContextSettings = {
    workspaceMetadata: true,
    activeFileMetadata: true,
    approvedFilePreview: true,
    diagnosticsSummary: false,
    selectedChangedFiles: []
  };
  private goalWorkflow: GoalWorkflowState = {
    status: "idle",
    autonomyEnabled: false,
    pursueGoalEnabled: false,
    fullOperatorEnabled: false,
    notes: [
      "Plan mode is available through chat and the approval selector.",
      "Developer Lab uses one explicitly approved, receipt-backed checkpoint at a time.",
      "Arbitrary shell, hidden continuation, and broad repository authority are unavailable."
    ]
  };

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: ElysiaApiClient,
    private readonly sessions: SessionStore,
    private readonly approvals: ApprovalController,
    private readonly workspaceTrust: WorkspaceTrust,
    private readonly diffs: FileDiffProvider
  ) {
    this.ideContext = this.sessions.getContextPreferences();
    this.activeSessionId = this.sessions.getActiveSessionId();
    this.lastRequestId = this.sessions.getLastReceipt().requestId;
  }

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
    const workspace = this.workspaceTrust.getStatus(this.repoApproval);
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
    await this.sessions.setActiveSessionId(session.id);
    this.busyAction = undefined;
    await this.postState();
  }

  public async clearSessions(): Promise<void> {
    this.busyAction = "clearSessions";
    this.lastAction = "Clearing sessions...";
    await this.postState();
    await this.sessions.clear();
    this.activeSessionId = null;
    this.ideContext = this.sessions.getContextPreferences();
    this.repoPreviews.clear();
    this.filePreviews.clear();
    this.patchProposals.clear();
    this.patchApplyResults.clear();
    this.commandResults.clear();
    this.operationAudits = [];
    this.documentOperations.clear();
    this.dataOperations.clear();
    this.visualOperations.clear();
    this.mediaOperations.clear();
    this.archiveOperations.clear();
    this.databaseOperations.clear();
    this.binaryOperations.clear();
    this.engineeringOperations.clear();
    this.fileOperations.clear();
    this.fileOperationRequests.clear();
    this.documentEditRequests.clear();
    this.visualEditRequests.clear();
    this.lastAction = "Local sessions cleared.";
    this.busyAction = undefined;
    await this.postState();
  }

  public async selectSession(sessionId: string): Promise<void> {
    if (!this.sessions.getSessions().some((session) => session.id === sessionId)) return;
    this.activeSessionId = sessionId;
    await this.sessions.setActiveSessionId(sessionId);
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
    this.mediaOperations.delete(sessionId);
    this.archiveOperations.delete(sessionId);
    this.databaseOperations.delete(sessionId);
    this.binaryOperations.delete(sessionId);
    this.engineeringOperations.delete(sessionId);
    this.fileOperations.delete(sessionId);
    this.fileOperationRequests.delete(sessionId);
    this.documentEditRequests.delete(sessionId);
    this.visualEditRequests.delete(sessionId);
    this.patchProposals.delete(sessionId);
    this.patchApplyResults.delete(sessionId);
    this.commandResults.delete(sessionId);
    const sessions = this.sessions.getSessions();
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = sessions[0]?.id ?? null;
      await this.sessions.setActiveSessionId(this.activeSessionId);
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
      this.ideContext = { ...message.settings, selectedChangedFiles: this.ideContext.selectedChangedFiles };
      await this.sessions.setContextPreferences(this.ideContext);
      this.lastAction = "IDE context settings updated.";
      await this.postState();
      return;
    }
    if (message.type === "toggleChangedFileContext") {
      const selected = new Set(this.ideContext.selectedChangedFiles);
      selected.has(message.path) ? selected.delete(message.path) : selected.add(message.path);
      const validChanged = new Set(this.diffs.getChangedFiles().map((item) => item.path));
      this.ideContext = { ...this.ideContext, selectedChangedFiles: [...selected].filter((item) => validChanged.has(item)).slice(0, 20) };
      await this.sessions.setContextPreferences(this.ideContext);
      this.diffs.setGitPreview(await this.safeGitPreview(), this.ideContext.selectedChangedFiles);
      this.lastAction = "Selected SCM context updated; source contents remain excluded.";
      await this.postState();
      return;
    }
    if (message.type === "approveWorkspaceRepo") {
      await this.approveWorkspaceRepo();
      return;
    }
    if (message.type === "revokeWorkspaceRepo") {
      await this.revokeWorkspaceRepo();
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
    if (message.type === "planGoal") {
      await this.planGoal(message.objective, message.maxSteps, message.maxMinutes);
      return;
    }
    if (message.type === "approveGoal") {
      await this.approveGoal();
      return;
    }
    if (message.type === "pursueGoal") {
      await this.runNextGoalCheckpoint();
      return;
    }
    if (message.type === "stopGoal") {
      await this.stopGoal();
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
    if (message.type === "planFileOperation") {
      await this.planFileOperation(message);
      return;
    }
    if (message.type === "applyApprovedFileOperation") {
      await this.applyApprovedFileOperation();
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
    if (message.type === "inspectActiveMedia") {
      await this.inspectActiveMedia();
      return;
    }
    if (message.type === "thumbnailActiveMedia") {
      await this.thumbnailActiveMedia();
      return;
    }
    if (message.type === "inspectActiveArchive") {
      await this.inspectActiveArchive();
      return;
    }
    if (message.type === "planArchiveExtraction") {
      await this.planArchiveExtraction(message.selectedMemberIndexes);
      return;
    }
    if (message.type === "applyApprovedArchiveExtraction") {
      await this.applyApprovedArchiveExtraction();
      return;
    }
    if (message.type === "inspectActiveDatabase") {
      await this.inspectActiveDatabase();
      return;
    }
    if (message.type === "previewActiveDatabaseSchema") {
      await this.previewActiveDatabaseSchema();
      return;
    }
    if (message.type === "inspectActiveBinary") {
      await this.inspectActiveBinary();
      return;
    }
    if (message.type === "inspectActiveEngineering") {
      await this.inspectActiveEngineering();
      return;
    }
    if (message.type === "planEngineeringPreview") {
      await this.planEngineeringPreview();
      return;
    }
    if (message.type === "applyApprovedEngineeringPreview") {
      await this.applyApprovedEngineeringPreview();
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
        approved_file_context: this.ideContext.approvedFilePreview ? this.toApprovedFileContext(approvedFilePreview) : undefined,
        selected_context: this.diffs.getChangedFiles()
          .filter((item) => this.ideContext.selectedChangedFiles.includes(item.path))
          .map((item) => ({ relative_path: item.path, context_kind: "scm_metadata" as const, scm_status: item.state, staged: item.staged }))
      });
      reply = chatReply.assistantText;
      this.lastRequestId = chatReply.requestId;
      this.contextReceipt = chatReply.contextReceipt;
      await this.sessions.setLastReceipt({ requestId: chatReply.requestId });
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
    const workspaceRoot = this.getWorkspaceRoot();
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
      const databaseOperation = this.databaseOperations.get(activeSessionId);
      if (preview.category !== "database" && preview.adapter !== "database") {
        this.databaseOperations.delete(activeSessionId);
      } else if (databaseOperation?.inspection?.relative_path !== preview.relative_path) {
        this.databaseOperations.delete(activeSessionId);
      }
      const binaryOperation = this.binaryOperations.get(activeSessionId);
      if (preview.category !== "binary" && preview.adapter !== "binary") {
        this.binaryOperations.delete(activeSessionId);
      } else if (binaryOperation?.inspection?.relative_path !== preview.relative_path) {
        this.binaryOperations.delete(activeSessionId);
      }
      const engineeringOperation = this.engineeringOperations.get(activeSessionId);
      if (preview.category !== "engineering" && preview.adapter !== "engineering") {
        this.engineeringOperations.delete(activeSessionId);
      } else if (engineeringOperation?.inspection?.relative_path !== preview.relative_path) {
        this.engineeringOperations.delete(activeSessionId);
      }
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = preview.status === "completed" ? "Selected-file preview updated." : "Selected-file preview blocked.";
      if (preview.status === "completed") {
        this.patchProposals.delete(activeSessionId);
        this.patchApplyResults.delete(activeSessionId);
        if (preview.category !== "document") this.documentOperations.delete(activeSessionId);
        if (preview.category !== "science_data" && preview.adapter !== "data") this.dataOperations.delete(activeSessionId);
        if (preview.category !== "visual") this.visualOperations.delete(activeSessionId);
        if (preview.category !== "media" && preview.adapter !== "media") this.mediaOperations.delete(activeSessionId);
        if (preview.category !== "archive" && preview.adapter !== "archive") this.archiveOperations.delete(activeSessionId);
        if (preview.category !== "engineering" && preview.adapter !== "engineering") this.engineeringOperations.delete(activeSessionId);
      }
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Selected-file preview failed.";
      this.lastAction = "Selected-file preview failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planFileOperation(message: Extract<WebviewToExtensionMessage, { type: "planFileOperation" }>): Promise<void> {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    if (!this.requireMutationMode("File operation planning") || !sessionId || !workspaceRoot) {
      if (!sessionId || !workspaceRoot) this.codingError = "Create a Codev session in a trusted approved workspace first.";
      await this.postState();
      return;
    }
    const targetPath = message.targetPath.trim();
    if (!targetPath) {
      this.codingError = "Enter the exact workspace-relative target path.";
      await this.postState();
      return;
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    this.busyAction = "fileOperationPlan";
    this.lastAction = `Planning governed ${message.operationKind}...`;
    await this.postState();
    try {
      const plan = await this.api.planFileOperation({
        session_id: session?.backendSessionId,
        approval_mode: this.approvals.getMode(),
        workspace_root: workspaceRoot,
        operation_kind: message.operationKind,
        target_path: targetPath,
        destination_path: message.destinationPath?.trim() || undefined,
        summary: `Codev planned ${message.operationKind} for ${targetPath}`,
        new_text: message.newText
      });
      this.fileOperations.set(sessionId, { plan, result: null });
      this.fileOperationRequests.set(sessionId, {
        operationKind: message.operationKind,
        targetPath,
        destinationPath: message.destinationPath?.trim() || undefined,
        newText: message.newText
      });
      this.codingError = plan.status === "preview_only" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = `File operation plan ${plan.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "File operation planning failed.";
      this.fileOperations.set(sessionId, { plan: null, result: null, lastError: this.codingError });
      this.lastAction = "File operation planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedFileOperation(): Promise<void> {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    if (!this.requireMutationMode("File operation") || !sessionId || !workspaceRoot) {
      if (!sessionId || !workspaceRoot) this.codingError = "Create a Codev session in a trusted approved workspace first.";
      await this.postState();
      return;
    }
    const state = this.fileOperations.get(sessionId);
    const plan = state?.plan;
    const request = this.fileOperationRequests.get(sessionId);
    if (!plan?.plan_hash || plan.status !== "preview_only" || !request) {
      this.codingError = "Create a current, unblocked file operation plan before approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Apply exact ${request.operationKind} operation to ${plan.target_relative_path ?? request.targetPath}${plan.destination_relative_path ? ` → ${plan.destination_relative_path}` : ""}?`,
      { modal: true },
      "Approve exact file operation"
    );
    if (approval !== "Approve exact file operation") {
      this.lastAction = "File operation cancelled.";
      await this.postState();
      return;
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    this.busyAction = "fileOperationApply";
    this.lastAction = `Applying approved ${request.operationKind}...`;
    await this.postState();
    try {
      const exactApproval = await this.issueExactApproval({
        sessionId: session?.backendSessionId,
        operationKind: `file_operation:${request.operationKind}`,
        operationSummary: `Apply ${request.operationKind} to ${plan.target_relative_path ?? request.targetPath}`,
        workspaceRoot,
        exactFiles: [request.targetPath, request.operationKind === "rename" || request.operationKind === "move" ? request.destinationPath ?? "" : ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: `file_${request.operationKind}`,
        rollbackNote: request.operationKind === "create" ? "The exact created file can be removed to roll back." : "A recoverable pre-mutation backup and rollback receipt are required."
      });
      const result = await this.api.applyApprovedFileOperation({
        session_id: session?.backendSessionId,
        approval_mode: this.approvals.getMode(),
        workspace_root: workspaceRoot,
        operation_kind: request.operationKind,
        target_path: request.targetPath,
        destination_path: request.destinationPath,
        summary: `Codev approved ${request.operationKind} for ${request.targetPath}`,
        new_text: request.newText,
        expected_content_hash: plan.source_hash,
        operator_approved: true,
        approval_phrase: "Approve exact file operation",
        ...exactApproval
      });
      this.fileOperations.set(sessionId, { plan, result });
      this.codingError = result.mutation_performed ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `File operation ${result.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "File operation failed.";
      this.fileOperations.set(sessionId, { plan, result: null, lastError: this.codingError });
      this.lastAction = "File operation failed.";
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
    const workspaceRoot = this.getWorkspaceRoot();
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
    if (!this.requireMutationMode("Document export")) {
      await this.postState();
      return;
    }
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
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "document_export",
        operationSummary: `Export ${plan.relative_path ?? plan.file_label} to ${plan.target_relative_path ?? "derived output"}`,
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath, plan.target_relative_path ?? ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: "document_export",
        rollbackNote: "The source document remains unchanged; a new derived export is created."
      });
      const result = await this.api.applyApprovedDocumentExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        export_format: format,
        target_path: plan.target_relative_path,
        expected_source_hash: plan.source_hash,
        overwrite_existing: false,
        ...exactApproval
      });
      this.documentOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Document export ${result.status}.`;
      await this.refreshOperationAudits();
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
    if (!this.requireMutationMode("Document edit")) {
      await this.postState();
      return;
    }
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
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "document_edit",
        operationSummary: `Apply ${request.operation} to ${plan.relative_path ?? plan.file_label}`,
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath, plan.target_relative_path && plan.target_relative_path !== plan.relative_path ? plan.target_relative_path : ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: "document_edit",
        rollbackNote: plan.target_relative_path && plan.target_relative_path !== plan.relative_path ? "A derived output is created." : "A pre-mutation backup and rollback receipt are required."
      });
      const result = await this.api.applyApprovedDocumentEdit({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        operation: request.operation,
        parameters: request.parameters,
        expected_source_hash: plan.source_hash,
        ...exactApproval
      });
      this.documentOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Document edit ${result.status}.`;
      await this.refreshOperationAudits();
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

  private getMediaOperation(sessionId: string): CodingMediaOperationState {
    const existing = this.mediaOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingMediaOperationState = {
      inspectPreview: null,
      thumbnailPreview: null
    };
    this.mediaOperations.set(sessionId, created);
    return created;
  }

  private getArchiveOperation(sessionId: string): CodingArchiveOperationState {
    const existing = this.archiveOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingArchiveOperationState = {
      inspectPreview: null,
      extractionPlan: null,
      extractionResult: null
    };
    this.archiveOperations.set(sessionId, created);
    return created;
  }

  private getDatabaseOperation(sessionId: string): CodingDatabaseOperationState {
    const existing = this.databaseOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingDatabaseOperationState = { inspection: null, schemaPreview: null };
    this.databaseOperations.set(sessionId, created);
    return created;
  }

  private getBinaryOperation(sessionId: string): CodingBinaryOperationState {
    const existing = this.binaryOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingBinaryOperationState = { inspection: null };
    this.binaryOperations.set(sessionId, created);
    return created;
  }

  private getEngineeringOperation(sessionId: string): CodingEngineeringOperationState {
    const existing = this.engineeringOperations.get(sessionId);
    if (existing) return existing;
    const created: CodingEngineeringOperationState = { inspection: null, previewPlan: null, previewResult: null };
    this.engineeringOperations.set(sessionId, created);
    return created;
  }

  private getActiveDataContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
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

  private getActiveVisualContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed visual file in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "visual" && preview?.adapter !== "visual" && preview?.adapter !== "svg") {
      return { error: "Read an approved preview of a supported visual file first." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private getActiveMediaContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed media file in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "media" && preview?.adapter !== "media") {
      return { error: "Read an approved preview of a supported audio/video file first." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private getActiveArchiveContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed archive/container in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "archive" && preview?.adapter !== "archive") {
      return { error: "Read an approved preview of a registered archive/container first." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private getActiveDatabaseContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed database in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "database" && preview?.adapter !== "database") {
      return { error: "Read an approved preview of a registered database file first." };
    }
    const currentRelativePath = path.relative(workspaceRoot, filePath).split(path.sep).join("/");
    if (preview.relative_path !== currentRelativePath) {
      return { error: "The active database changed. Read its approved selected-file preview before requesting DatabaseForge." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private getActiveBinaryContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed binary in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "binary" && preview?.adapter !== "binary") {
      return { error: "Read an approved preview of a registered binary file first." };
    }
    const currentRelativePath = path.relative(workspaceRoot, filePath).split(path.sep).join("/");
    if (preview.relative_path !== currentRelativePath) {
      return { error: "The active binary changed. Read its approved selected-file preview before requesting BinaryForge." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private getActiveEngineeringContext(): { sessionId: string; workspaceRoot: string; filePath: string; backendSessionId?: string } | { error: string } {
    const sessionId = this.activeSessionId;
    const workspaceRoot = this.getWorkspaceRoot();
    const filePath = this.diffs.getActiveFilePath();
    if (!sessionId) return { error: "Create or select a Codev session first." };
    if (!workspaceRoot || !filePath) return { error: "Open a file-backed engineering file in the workspace first." };
    const preview = this.filePreviews.get(sessionId);
    if (preview?.category !== "engineering" && preview?.adapter !== "engineering") {
      return { error: "Read the registered engineering file descriptor first; raw engineering source content remains excluded." };
    }
    const currentRelativePath = path.relative(workspaceRoot, filePath).split(path.sep).join("/");
    if (preview.relative_path !== currentRelativePath) {
      return { error: "The active engineering file changed. Refresh its selected-file descriptor before requesting EngineeringForge." };
    }
    const session = this.sessions.getSessions().find((item) => item.id === sessionId);
    return { sessionId, workspaceRoot, filePath, backendSessionId: session?.backendSessionId };
  }

  private requireMutationMode(label: string): boolean {
    if (this.approvals.canApplyPatch()) return true;
    this.codingError = `${label} requires apply with approval or test with approval mode.`;
    this.lastAction = `${label} blocked by approval mode.`;
    return false;
  }

  private async issueExactApproval(input: {
    sessionId?: string;
    operationKind: string;
    operationSummary: string;
    workspaceRoot: string;
    exactFiles: string[];
    sourceHash?: string;
    planHash?: string;
    mutationClass: string;
    rollbackNote: string;
  }): Promise<{ approval_id: string; approval_token: string }> {
    if (!input.planHash) throw new Error("The backend plan did not include the exact plan hash required for approval.");
    const approval = await this.api.approveOperation({
      session_id: input.sessionId,
      operation_kind: input.operationKind,
      operation_summary: input.operationSummary,
      workspace_root: input.workspaceRoot,
      exact_files: input.exactFiles.filter(Boolean),
      source_hash: input.sourceHash,
      plan_hash: input.planHash,
      allowed_mutation_class: input.mutationClass,
      expires_in_seconds: 300,
      operator_approved: true,
      approval_phrase: "Approved in Codev modal",
      rollback_note: input.rollbackNote
    });
    return { approval_id: approval.approval_id, approval_token: approval.approval_token as string };
  }

  private async refreshOperationAudits(): Promise<void> {
    try {
      this.operationAudits = await this.api.listOperationAudits(20);
    } catch {
      // The operation result remains authoritative even if the compact audit read surface is unavailable.
    }
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
    if (!this.requireMutationMode("Data export")) {
      await this.postState();
      return;
    }
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
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "data_export",
        operationSummary: `Export ${plan.relative_path ?? plan.file_label} to ${plan.target_relative_path ?? "derived output"}`,
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath, plan.target_relative_path ?? ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: "data_export",
        rollbackNote: "The source dataset remains unchanged; a new bounded summary export is created."
      });
      const result = await this.api.applyApprovedDataExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        export_format: format,
        target_path: plan.target_relative_path,
        expected_source_hash: plan.source_hash,
        overwrite_existing: false,
        ...exactApproval
      });
      this.dataOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Data export ${result.status}.`;
      await this.refreshOperationAudits();
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
    if (!this.requireMutationMode("Data mutation")) {
      await this.postState();
      return;
    }
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
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "data_edit",
        operationSummary: `Apply ${request.operation} to ${plan.relative_path ?? plan.file_label}`,
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath, plan.target_relative_path ?? ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: "data_edit",
        rollbackNote: plan.target_relative_path ? "A derived output is created." : "The backend must create an adapter-appropriate backup or transaction receipt."
      });
      const result = await this.api.applyApprovedDataMutation({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        operation: request.operation,
        parameters: request.parameters,
        expected_source_hash: plan.source_hash,
        ...exactApproval
      });
      this.dataOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Data mutation ${result.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Data mutation failed.";
      this.dataOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Data mutation failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveVisual(): Promise<void> {
    const context = this.getActiveVisualContext();
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
    const context = this.getActiveVisualContext();
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
    const context = this.getActiveVisualContext();
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
    const context = this.getActiveVisualContext();
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
    const context = this.getActiveVisualContext();
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
    if (!this.requireMutationMode("Visual export")) {
      await this.postState();
      return;
    }
    const context = this.getActiveVisualContext();
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
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "visual_export",
        operationSummary: `Export ${plan.relative_path ?? plan.file_label} to ${plan.target_relative_path ?? "derived output"}`,
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath, plan.target_relative_path ?? ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: "visual_export",
        rollbackNote: "The source visual remains unchanged; a governed derived copy is created."
      });
      const result = await this.api.applyApprovedVisualExport({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        export_format: exportFormat,
        target_path: plan.target_relative_path,
        expected_source_hash: plan.source_hash,
        ...exactApproval
      });
      this.visualOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Visual export ${result.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual export failed.";
      this.visualOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Visual export failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planVisualEdit(operationName: string, parameters: Record<string, unknown>): Promise<void> {
    const context = this.getActiveVisualContext();
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
    if (!this.requireMutationMode("Visual edit")) {
      await this.postState();
      return;
    }
    const context = this.getActiveVisualContext();
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
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "visual_edit",
        operationSummary: `Apply ${request.operation} to ${plan.relative_path ?? plan.file_label}`,
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath, plan.target_relative_path ?? ""],
        sourceHash: plan.source_hash,
        planHash: plan.plan_hash,
        mutationClass: "visual_edit",
        rollbackNote: "The source visual remains unchanged; a privacy-preserving derived copy is created."
      });
      const result = await this.api.applyApprovedVisualEdit({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        operator_approved: true,
        operation: request.operation,
        parameters: request.parameters,
        expected_source_hash: plan.source_hash,
        ...exactApproval
      });
      this.visualOperations.set(context.sessionId, { ...operation, applyResult: result, lastError: undefined });
      this.codingError = result.status === "applied" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Visual edit ${result.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Visual edit failed.";
      this.visualOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Visual edit failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveMedia(): Promise<void> {
    const context = this.getActiveMediaContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "mediaInspect";
    this.lastAction = "Inspecting local media metadata...";
    await this.postState();
    try {
      const preview = await this.api.inspectMedia({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      const operation = this.getMediaOperation(context.sessionId);
      this.mediaOperations.set(context.sessionId, { ...operation, inspectPreview: preview, lastError: undefined });
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = `Media inspection ${preview.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Media inspection failed.";
      this.mediaOperations.set(context.sessionId, { ...this.getMediaOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Media inspection failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async thumbnailActiveMedia(): Promise<void> {
    const context = this.getActiveMediaContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const approvedPreview = this.filePreviews.get(context.sessionId);
    const summaryDescriptor = approvedPreview?.parse_summary?.descriptor;
    const summarizedFamily = typeof approvedPreview?.parse_summary?.media_family === "string"
      ? approvedPreview.parse_summary.media_family
      : typeof summaryDescriptor === "object" && summaryDescriptor !== null && "media_family" in summaryDescriptor
        ? String((summaryDescriptor as { media_family?: unknown }).media_family ?? "")
        : approvedPreview?.descriptor?.media_family;
    if (summarizedFamily !== "video") {
      this.codingError = "Safe thumbnails are available only for supported video files.";
      this.lastAction = "Media thumbnail not applicable.";
      await this.postState();
      return;
    }
    this.busyAction = "mediaThumbnail";
    this.lastAction = "Deriving approved local video thumbnail...";
    await this.postState();
    try {
      const preview = await this.api.thumbnailMedia({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_confirmed_in_vscode"
      });
      const operation = this.getMediaOperation(context.sessionId);
      this.mediaOperations.set(context.sessionId, { ...operation, inspectPreview: preview, thumbnailPreview: preview, lastError: undefined });
      this.codingError = preview.thumbnail_status === "completed" ? undefined : preview.blocked_reason ?? preview.thumbnail_status;
      this.lastAction = `Media thumbnail ${preview.thumbnail_status ?? preview.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Media thumbnail failed.";
      this.mediaOperations.set(context.sessionId, { ...this.getMediaOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Media thumbnail failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveArchive(): Promise<void> {
    const context = this.getActiveArchiveContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "archiveInspect";
    this.lastAction = "Listing archive contents and building risk report...";
    await this.postState();
    try {
      const preview = await this.api.inspectArchive({
        workspace_root: context.workspaceRoot,
        archive_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_requested_archive_listing_and_risk_report_in_codev"
      });
      this.archiveOperations.set(context.sessionId, {
        inspectPreview: preview,
        extractionPlan: null,
        extractionResult: null
      });
      this.codingError = preview.status === "completed" ? undefined : preview.blocked_reason ?? preview.status;
      this.lastAction = `Archive inspection ${preview.status}; no contents were extracted or executed.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Archive inspection failed.";
      this.archiveOperations.set(context.sessionId, { ...this.getArchiveOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Archive inspection failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planArchiveExtraction(selectedMemberIndexes: number[]): Promise<void> {
    const context = this.getActiveArchiveContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    if (!selectedMemberIndexes.length) {
      this.codingError = "Select at least one eligible regular file before planning sandbox extraction.";
      await this.postState();
      return;
    }
    this.busyAction = "archivePlan";
    this.lastAction = "Planning exact selected-file sandbox extraction...";
    await this.postState();
    try {
      const plan = await this.api.planArchiveExtraction({
        workspace_root: context.workspaceRoot,
        archive_path: context.filePath,
        session_id: context.backendSessionId,
        selected_member_indexes: selectedMemberIndexes,
        approval_granted: true,
        approval_reason: "operator_requested_selected_sandbox_extraction_plan_in_codev"
      });
      const operation = this.getArchiveOperation(context.sessionId);
      this.archiveOperations.set(context.sessionId, { ...operation, extractionPlan: plan, extractionResult: null, lastError: undefined });
      this.codingError = plan.status === "planned" ? undefined : plan.blocked_reason ?? plan.status;
      this.lastAction = `Archive extraction plan ${plan.status}; no files were written.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Archive extraction planning failed.";
      this.archiveOperations.set(context.sessionId, { ...this.getArchiveOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Archive extraction planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedArchiveExtraction(): Promise<void> {
    if (!this.requireMutationMode("Archive sandbox extraction")) {
      await this.postState();
      return;
    }
    const context = this.getActiveArchiveContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getArchiveOperation(context.sessionId);
    const plan = operation.extractionPlan;
    if (!plan || plan.status !== "planned") {
      this.codingError = "Plan selected-file sandbox extraction before approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      `Extract exactly ${plan.selected_file_count} selected file(s) into disposable sandbox ${plan.sandbox_id}? No content will be opened, installed, executed, trusted, or moved into the project.`,
      { modal: true },
      "Approve selected sandbox extraction"
    );
    if (approval !== "Approve selected sandbox extraction") {
      this.lastAction = "Archive extraction cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "archiveApply";
    this.lastAction = "Applying exact-approved selected sandbox extraction...";
    await this.postState();
    try {
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "archive_extract",
        operationSummary: "Extract exact selected archive members into exact disposable sandbox",
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath],
        sourceHash: plan.archive_sha256,
        planHash: plan.plan_hash,
        mutationClass: "archive_sandbox_extract",
        rollbackNote: "Abort cleanup removes partial sandbox output; the source archive remains unchanged."
      });
      const result = await this.api.applyApprovedArchiveExtraction({
        operation_id: plan.operation_id,
        workspace_root: context.workspaceRoot,
        archive_path: context.filePath,
        session_id: context.backendSessionId,
        selected_member_indexes: plan.selected_member_indexes,
        sandbox_id: plan.sandbox_id,
        approval_granted: true,
        approval_reason: "operator_exact_approved_selected_sandbox_extraction_in_codev",
        operator_approved: true,
        expected_archive_sha256: plan.archive_sha256,
        expected_manifest_digest: plan.manifest_digest,
        expected_plan_hash: plan.plan_hash,
        ...exactApproval
      });
      this.archiveOperations.set(context.sessionId, { ...operation, extractionResult: result, lastError: undefined });
      this.codingError = result.status === "completed" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Archive sandbox extraction ${result.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Archive sandbox extraction failed.";
      this.archiveOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Archive sandbox extraction failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveDatabase(): Promise<void> {
    const context = this.getActiveDatabaseContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "databaseInspect";
    this.lastAction = "Identifying database and computing static metadata...";
    await this.postState();
    try {
      const inspection = await this.api.inspectDatabase({
        workspace_root: context.workspaceRoot,
        database_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_requested_static_database_metadata_in_codev"
      });
      this.databaseOperations.set(context.sessionId, { inspection, schemaPreview: null });
      this.codingError = inspection.status === "completed" ? undefined : inspection.blocked_reason ?? inspection.status;
      this.lastAction = `Database metadata ${inspection.status}; no schema or rows were opened.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Database metadata inspection failed.";
      this.databaseOperations.set(context.sessionId, { ...this.getDatabaseOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Database metadata inspection failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async previewActiveDatabaseSchema(): Promise<void> {
    const context = this.getActiveDatabaseContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getDatabaseOperation(context.sessionId);
    const inspection = operation.inspection;
    if (!inspection?.source_sha256 || !inspection.schema_preview_plan_hash || inspection.descriptor.schema_preview_state !== "approval_required") {
      this.codingError = "Inspect a supported SQLite or DuckDB file before requesting schema approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      "Preview schema names and definitions from a private read-only snapshot of this exact database? Schema names may be sensitive. No rows, arbitrary SQL, extensions, export, or mutation are allowed.",
      { modal: true },
      "Approve exact schema preview"
    );
    if (approval !== "Approve exact schema preview") {
      this.lastAction = "Database schema preview cancelled.";
      await this.postState();
      return;
    }
    this.busyAction = "databaseSchema";
    this.lastAction = "Creating exact-approved read-only database snapshot...";
    await this.postState();
    try {
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "database_schema_preview",
        operationSummary: "Preview schema from exact read-only database snapshot",
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath],
        sourceHash: inspection.source_sha256,
        planHash: inspection.schema_preview_plan_hash,
        mutationClass: "database_schema_preview",
        rollbackNote: "Read-only snapshot and fixed introspection only; the source is never mutated."
      });
      const schemaPreview = await this.api.previewApprovedDatabaseSchema({
        workspace_root: context.workspaceRoot,
        database_path: context.filePath,
        session_id: context.backendSessionId,
        operator_approved: true,
        expected_source_sha256: inspection.source_sha256,
        expected_plan_hash: inspection.schema_preview_plan_hash,
        ...exactApproval
      });
      this.databaseOperations.set(context.sessionId, { ...operation, schemaPreview, lastError: undefined });
      this.codingError = schemaPreview.status === "completed" ? undefined : schemaPreview.blocked_reason ?? schemaPreview.status;
      this.lastAction = `Database schema preview ${schemaPreview.status}; rows returned ${schemaPreview.row_data_returned ? "yes" : "no"}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Database schema preview failed.";
      this.databaseOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Database schema preview failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveBinary(): Promise<void> {
    const context = this.getActiveBinaryContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "binaryInspect";
    this.lastAction = "Performing bounded static binary inspection...";
    await this.postState();
    try {
      const inspection = await this.api.inspectBinary({
        workspace_root: context.workspaceRoot,
        binary_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_requested_static_binary_metadata_in_codev"
      });
      this.binaryOperations.set(context.sessionId, { inspection });
      this.codingError = inspection.status === "completed" ? undefined : inspection.blocked_reason ?? inspection.status;
      this.lastAction = `Binary inspection ${inspection.status}; execution, loading, and mutation did not occur.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Static binary inspection failed.";
      this.binaryOperations.set(context.sessionId, { ...this.getBinaryOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "Static binary inspection failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async inspectActiveEngineering(): Promise<void> {
    const context = this.getActiveEngineeringContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    this.busyAction = "engineeringInspect";
    this.lastAction = "Performing bounded local engineering inspection...";
    await this.postState();
    try {
      const inspection = await this.api.inspectEngineering({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_requested_bounded_engineering_inspection_in_codev"
      });
      this.engineeringOperations.set(context.sessionId, { inspection, previewPlan: null, previewResult: null });
      this.codingError = inspection.status === "completed" ? undefined : inspection.blocked_reason ?? inspection.status;
      this.lastAction = `Engineering inspection ${inspection.status}; mutation, execution, sending, actuation, and upload did not occur.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "EngineeringForge inspection failed.";
      this.engineeringOperations.set(context.sessionId, { ...this.getEngineeringOperation(context.sessionId), lastError: this.codingError });
      this.lastAction = "EngineeringForge inspection failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planEngineeringPreview(): Promise<void> {
    const context = this.getActiveEngineeringContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getEngineeringOperation(context.sessionId);
    if (!operation.inspection?.source_sha256 || operation.inspection.descriptor.preview_state !== "approval_required") {
      this.codingError = "Inspect a format with a live safe local preview before planning one.";
      await this.postState();
      return;
    }
    this.busyAction = "engineeringPreviewPlan";
    this.lastAction = "Planning a bounded local engineering projection...";
    await this.postState();
    try {
      const previewPlan = await this.api.planEngineeringPreview({
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_requested_local_engineering_preview_plan_in_codev"
      });
      this.engineeringOperations.set(context.sessionId, { ...operation, previewPlan, previewResult: null, lastError: undefined });
      this.codingError = previewPlan.status === "planned" ? undefined : previewPlan.blocked_reason ?? previewPlan.status;
      this.lastAction = `Engineering preview plan ${previewPlan.status}; no artifact projection was created yet.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Engineering preview planning failed.";
      this.engineeringOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Engineering preview planning failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async applyApprovedEngineeringPreview(): Promise<void> {
    const context = this.getActiveEngineeringContext();
    if ("error" in context) {
      this.codingError = context.error;
      await this.postState();
      return;
    }
    const operation = this.getEngineeringOperation(context.sessionId);
    const plan = operation.previewPlan;
    if (!plan || plan.status !== "planned" || !plan.source_sha256 || !plan.plan_hash) {
      this.codingError = "Plan a supported safe local engineering preview before approval.";
      await this.postState();
      return;
    }
    const approval = await vscode.window.showWarningMessage(
      "Create a bounded local SVG projection for this exact engineering file? This does not simulate, repair, print, machine, send, actuate, certify, upload, or mutate the source.",
      { modal: true },
      "Approve exact engineering preview"
    );
    if (approval !== "Approve exact engineering preview") {
      this.lastAction = "Engineering preview cancelled before approval.";
      await this.postState();
      return;
    }
    this.busyAction = "engineeringPreviewApply";
    this.lastAction = "Creating exact-approved private local engineering projection...";
    await this.postState();
    try {
      const exactApproval = await this.issueExactApproval({
        sessionId: context.backendSessionId,
        operationKind: "engineering_preview",
        operationSummary: "Create exact bounded local engineering SVG projection",
        workspaceRoot: context.workspaceRoot,
        exactFiles: [context.filePath],
        sourceHash: plan.source_sha256,
        planHash: plan.plan_hash,
        mutationClass: "engineering_preview_artifact",
        rollbackNote: "Delete the private local artifact; the engineering source and project remain unchanged."
      });
      const previewResult = await this.api.applyApprovedEngineeringPreview({
        operation_id: plan.operation_id,
        workspace_root: context.workspaceRoot,
        file_path: context.filePath,
        session_id: context.backendSessionId,
        approval_granted: true,
        approval_reason: "operator_exact_approved_local_engineering_preview_in_codev",
        operator_approved: true,
        expected_source_sha256: plan.source_sha256,
        expected_plan_hash: plan.plan_hash,
        ...exactApproval
      });
      this.engineeringOperations.set(context.sessionId, { ...operation, previewResult, lastError: undefined });
      this.codingError = previewResult.status === "completed" ? undefined : previewResult.blocked_reason ?? previewResult.status;
      this.lastAction = `Engineering preview ${previewResult.status}; source/project mutation no/no and physical output no.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Engineering preview failed.";
      this.engineeringOperations.set(context.sessionId, { ...operation, lastError: this.codingError });
      this.lastAction = "Engineering preview failed.";
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
    const workspaceRoot = this.getWorkspaceRoot();
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
      const expectedHash = proposal.expected_content_hash ?? preview.content_hash;
      const exactApproval = await this.issueExactApproval({
        sessionId: session?.backendSessionId,
        operationKind: "patch_apply",
        operationSummary: `Apply patch ${proposal.patch_hash} to ${preview.relative_path ?? preview.file_label}`,
        workspaceRoot,
        exactFiles: [preview.relative_path ?? preview.file_label],
        sourceHash: expectedHash,
        planHash: proposal.patch_hash,
        mutationClass: "text_patch",
        rollbackNote: "A pre-mutation backup and rollback receipt are required."
      });
      const result = await this.api.applyApprovedPatch({
        session_id: session?.backendSessionId,
        approval_mode: this.approvals.getMode(),
        workspace_root: workspaceRoot,
        target_file: preview.relative_path ?? preview.file_label,
        proposed_diff: proposal.diff_preview,
        expected_content_hash: expectedHash,
        patch_hash: proposal.patch_hash,
        operator_approved: true,
        approval_phrase: "Apply approved patch",
        ...exactApproval
      });
      this.patchApplyResults.set(sessionId, result);
      this.codingError = result.mutation_performed ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = result.mutation_performed ? "Approved patch applied." : "Patch apply blocked.";
      await this.refreshOperationAudits();
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
      const catalogEntry = this.commandCatalog?.entries.find((entry) => entry.command_id === commandId);
      if (!catalogEntry) throw new Error(`Elysia's bounded catalog does not contain "${commandId}".`);
      if (!catalogEntry.execution_enabled) throw new Error(catalogEntry.disabled_reason ?? `Check "${commandId}" is profile- or worker-gated.`);
      const session = this.sessions.getSessions().find((item) => item.id === sessionId);
      const plan = await this.api.planCommand({
        session_id: session?.backendSessionId,
        approval_mode: this.approvals.getMode(),
        workspace_root: workspaceRoot,
        command: catalogEntry.command,
        purpose: `Codev approved check: ${commandId}`
      });
      if (!plan.execution_enabled || !plan.plan_hash || plan.command_id !== commandId) {
        throw new Error(plan.blocked_reason ?? `Command plan was not executable (${plan.status}).`);
      }
      const exactApproval = await this.issueExactApproval({
        sessionId: session?.backendSessionId,
        operationKind: "command_run",
        operationSummary: `Run exact allowlisted check ${commandId}`,
        workspaceRoot,
        exactFiles: [],
        planHash: plan.plan_hash,
        mutationClass: "command_check",
        rollbackNote: "This read-only diff check cannot invoke a shell, install packages, or mutate git."
      });
      const result = await this.api.runApprovedCommand({
        ...exactApproval,
        approval_mode: this.approvals.getMode(),
        command_id: commandId,
        workspace_root: workspaceRoot,
        operator_approved: true
      });
      this.commandResults.set(sessionId, result);
      this.lastRequestId = result.request_id;
      await this.sessions.setLastReceipt({ requestId: result.request_id, operationId: result.operation_id });
      this.codingError = result.status === "completed" ? undefined : result.blocked_reason ?? result.status;
      this.lastAction = `Approved check ${result.status}.`;
      await this.refreshOperationAudits();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Approved check failed.";
      this.lastAction = "Approved check failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  public async approveWorkspaceRepo(): Promise<void> {
    const workspaceRoot = this.getCandidateWorkspaceRoot();
    if (!workspaceRoot || !vscode.workspace.isTrusted) {
      this.codingError = "Open exactly one trusted VS Code workspace before approving repository access.";
      await this.postState();
      return;
    }
    this.busyAction = "repoApproval";
    this.lastAction = "Planning exact repository approval...";
    await this.postState();
    try {
      const plan = await this.api.planRepoApproval(workspaceRoot);
      if (plan.status !== "approval_required" || !plan.plan_id || !plan.plan_hash) throw new Error(plan.blocked_reason ?? "Repository approval plan was not issued.");
      const answer = await vscode.window.showWarningMessage(
        `Approve exact repository "${plan.workspace_label}" (${plan.workspace_root_hash}) for governed Codev operations? This grants no shell, Git mutation, package, network, push, or publish authority.`,
        { modal: true },
        "Approve exact repository"
      );
      if (answer !== "Approve exact repository") {
        this.lastAction = "Repository approval cancelled.";
      } else {
        const result = await this.api.applyRepoApproval(plan.plan_id, plan.plan_hash);
        if (!result.approved) throw new Error(result.blocked_reason ?? `Repository approval ${result.status}.`);
        this.repoApproval = await this.api.getRepoApprovalStatus(workspaceRoot);
        this.lastRequestId = this.api.lastRequestId;
        await this.sessions.setLastReceipt({ requestId: this.lastRequestId, operationId: result.operation_id });
        this.diffs.setGitPreview(await this.safeGitPreview(), this.ideContext.selectedChangedFiles);
        this.codingError = undefined;
        this.lastAction = "Exact repository approved; each mutation and check still requires separate approval.";
      }
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Repository approval failed closed.";
      this.lastAction = "Repository approval failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  public async revokeWorkspaceRepo(): Promise<void> {
    const workspaceRoot = this.getCandidateWorkspaceRoot();
    if (!workspaceRoot || !this.repoApproval.approved) {
      this.codingError = "No approved repository is active.";
      await this.postState();
      return;
    }
    const answer = await vscode.window.showWarningMessage(
      `Revoke Codev authority for "${this.repoApproval.workspaceLabel}"? Runtime repo access stops immediately.`,
      { modal: true },
      "Revoke repository approval"
    );
    if (answer !== "Revoke repository approval") return;
    this.busyAction = "repoRevoke";
    await this.postState();
    try {
      const result = await this.api.revokeRepoApproval(workspaceRoot);
      this.repoApproval = { ...UNKNOWN_REPO_APPROVAL, status: "revoked", workspaceLabel: result.workspace_label ?? this.repoApproval.workspaceLabel, workspaceRootHash: result.workspace_root_hash, revoked: true };
      this.diffs.setGitPreview(null, []);
      this.ideContext = { ...this.ideContext, selectedChangedFiles: [] };
      this.goalTaskToken = undefined;
      this.lastRequestId = this.api.lastRequestId;
      await this.sessions.setContextPreferences(this.ideContext);
      await this.sessions.setLastReceipt({ requestId: this.lastRequestId, operationId: result.operation_id });
      this.codingError = undefined;
      this.lastAction = "Repository approval revoked; repo, patch, command, and task authority is off.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Repository revocation failed closed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async planGoal(objective: string, maxSteps: number, maxMinutes: number): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot || !objective.trim()) {
      this.codingError = "A trusted, approved repository and a bounded objective are required.";
      await this.postState();
      return;
    }
    this.busyAction = "goalPlan";
    await this.postState();
    try {
      const session = this.sessions.getSessions().find((item) => item.id === this.activeSessionId);
      const plan = await this.api.planCodingTask({
        session_id: session?.backendSessionId,
        objective: objective.trim(),
        workspace_label: this.repoApproval.workspaceLabel,
        workspace_root: workspaceRoot,
        allowed_files: this.ideContext.selectedChangedFiles,
        max_steps: Math.max(1, Math.min(8, maxSteps)),
        max_minutes: Math.max(1, Math.min(30, maxMinutes))
      });
      this.goalTaskToken = undefined;
      this.goalWorkflow = {
        status: plan.status === "approval_required" ? "approval_required" : "blocked",
        currentGoal: plan.objective,
        taskId: plan.task_id,
        taskHash: plan.task_hash,
        currentStep: plan.current_step,
        maxSteps: plan.max_steps,
        maxMinutes: plan.max_minutes,
        autonomyEnabled: false,
        pursueGoalEnabled: false,
        fullOperatorEnabled: false,
        notes: [...plan.plan_steps, ...plan.warnings]
      };
      this.lastRequestId = this.api.lastRequestId;
      this.codingError = plan.blocked_reason;
      this.lastAction = `Developer Lab plan ${plan.status}; nothing executed.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Developer Lab plan failed closed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async approveGoal(): Promise<void> {
    if (!this.goalWorkflow.taskId || !this.goalWorkflow.taskHash) {
      this.codingError = "Create a bounded Developer Lab plan first.";
      await this.postState();
      return;
    }
    const answer = await vscode.window.showWarningMessage(
      `Approve the bounded plan for up to ${this.goalWorkflow.maxSteps} manually requested checkpoints and ${this.goalWorkflow.maxMinutes} minutes? No checkpoint executes tools, patches, commands, or background work.`,
      { modal: true },
      "Approve bounded plan"
    );
    if (answer !== "Approve bounded plan") return;
    this.busyAction = "goalApprove";
    await this.postState();
    try {
      const approval = await this.api.approveCodingTask(this.goalWorkflow.taskId, this.goalWorkflow.taskHash);
      if (approval.status !== "approved_checkpoint_only" || !approval.task_token) throw new Error(approval.blocked_reason ?? "Bounded task approval was not issued.");
      this.goalTaskToken = approval.task_token;
      this.goalWorkflow = { ...this.goalWorkflow, status: "approved_checkpoint_only", pursueGoalEnabled: true, notes: approval.warnings };
      this.lastRequestId = this.api.lastRequestId;
      this.lastAction = "Bounded plan approved; use Run next checkpoint for one receipt-only step.";
      this.codingError = undefined;
    } catch (error) {
      this.goalTaskToken = undefined;
      this.codingError = error instanceof Error ? error.message : "Bounded task approval failed closed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async runNextGoalCheckpoint(): Promise<void> {
    if (!this.goalWorkflow.taskId || !this.goalTaskToken || !this.goalWorkflow.pursueGoalEnabled) {
      this.codingError = "Approve a bounded Developer Lab plan before requesting one checkpoint.";
      await this.postState();
      return;
    }
    const answer = await vscode.window.showWarningMessage("Run exactly one receipt-only Developer Lab checkpoint? No patch, command, shell, or background continuation will run.", { modal: true }, "Run one checkpoint");
    if (answer !== "Run one checkpoint") return;
    this.busyAction = "goalNext";
    await this.postState();
    try {
      const checkpoint = await this.api.runNextCodingTaskCheckpoint(this.goalWorkflow.taskId, this.goalTaskToken);
      const complete = checkpoint.status === "complete" || checkpoint.current_step >= checkpoint.max_steps;
      this.goalWorkflow = {
        ...this.goalWorkflow,
        status: complete ? "complete" : checkpoint.status === "checkpoint_ready" ? "checkpoint_ready" : "blocked",
        currentStep: checkpoint.current_step,
        receiptId: checkpoint.receipt_id,
        nextStepLabel: checkpoint.step_label,
        pursueGoalEnabled: !complete && checkpoint.status === "checkpoint_ready",
        notes: checkpoint.warnings
      };
      this.lastRequestId = this.api.lastRequestId;
      await this.sessions.setLastReceipt({ requestId: this.lastRequestId, operationId: checkpoint.receipt_id });
      this.codingError = checkpoint.blocked_reason;
      this.lastAction = checkpoint.status === "checkpoint_ready" ? "One checkpoint recorded; no tool or mutation ran." : `Developer Lab task ${checkpoint.status}.`;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Developer Lab checkpoint failed closed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async stopGoal(): Promise<void> {
    const taskId = this.goalWorkflow.taskId;
    this.busyAction = "goalStop";
    await this.postState();
    try {
      const stopped = taskId ? await this.api.stopCodingTask(taskId) : null;
      this.goalTaskToken = undefined;
      this.goalWorkflow = { ...this.goalWorkflow, status: "stopped", pursueGoalEnabled: false, receiptId: stopped?.receipt_id, notes: stopped?.warnings ?? ["No task was active; local stop state recorded."] };
      this.lastRequestId = this.api.lastRequestId;
      this.codingError = undefined;
      this.lastAction = "Developer Lab task stopped and token revoked; no background continuation exists.";
    } catch (error) {
      this.goalTaskToken = undefined;
      this.codingError = error instanceof Error ? error.message : "Task stop failed closed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async refreshCodingStatus(): Promise<void> {
    this.busyAction = "refresh";
    this.lastAction = "Refreshing coding bridge...";
    await this.postState();
    try {
      [this.connectionStatus, this.codingBridge, this.developerProfile, this.commandCatalog] = await Promise.all([
        this.api.getStatus(),
        this.api.getCodingStatus(),
        this.api.getDeveloperProfile(),
        this.api.getCommandCatalog()
      ]);
      const candidateRoot = this.getCandidateWorkspaceRoot();
      if (candidateRoot && vscode.workspace.isTrusted) {
        this.repoApproval = await this.api.getRepoApprovalStatus(candidateRoot);
      } else {
        this.repoApproval = {
          ...UNKNOWN_REPO_APPROVAL,
          status: candidateRoot ? "blocked" : "unknown",
          workspaceLabel: vscode.workspace.workspaceFolders?.[0]?.name ?? "No workspace",
          blockedReason: candidateRoot ? "vscode_workspace_untrusted" : "no_workspace"
        };
      }
      const gitPreview = await this.safeGitPreview();
      this.ideContext = {
        ...this.ideContext,
        selectedChangedFiles: this.ideContext.selectedChangedFiles.filter((item) => gitPreview?.changed_files.some((file) => file.relative_path === item))
      };
      await this.sessions.setContextPreferences(this.ideContext);
      this.diffs.setGitPreview(gitPreview, this.ideContext.selectedChangedFiles);
      try {
        this.mediaWorkerTruth = await this.api.getMediaWorkerTruth();
      } catch {
        this.mediaWorkerTruth = null;
      }
      await this.refreshOperationAudits();
      this.codingError = undefined;
      this.lastRequestId = this.api.lastRequestId;
      this.lastAction = "Coding bridge, Developer profile, repository approval, and SCM truth refreshed.";
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Local Elysia coding bridge unavailable.";
      this.lastAction = "Coding bridge refresh failed.";
    }
    this.busyAction = undefined;
    await this.postState();
  }

  private async buildState(): Promise<WebviewState> {
    const sessions = this.sessions.getSessions();
    if (!this.activeSessionId && sessions[0]) {
      this.activeSessionId = sessions[0].id;
    }
    const connection = this.connectionStatus ?? await this.api.getStatus();
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
      workspace: this.workspaceTrust.getStatus(this.repoApproval),
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
        developerProfile: this.developerProfile,
        commandCatalog: this.commandCatalog,
        repoApproval: this.repoApproval,
        repoPreview: activePreview,
        filePreview: activeFilePreview,
        patchApplyResult: this.activeSessionId ? this.patchApplyResults.get(this.activeSessionId) ?? null : null,
        commandResult: this.activeSessionId ? this.commandResults.get(this.activeSessionId) ?? null : null,
        documentOperation: this.activeSessionId ? this.documentOperations.get(this.activeSessionId) ?? null : null,
        dataOperation: this.activeSessionId ? this.dataOperations.get(this.activeSessionId) ?? null : null,
        visualOperation: this.activeSessionId ? this.visualOperations.get(this.activeSessionId) ?? null : null,
        mediaOperation: this.activeSessionId ? this.mediaOperations.get(this.activeSessionId) ?? null : null,
        archiveOperation: this.activeSessionId ? this.archiveOperations.get(this.activeSessionId) ?? null : null,
        databaseOperation: this.activeSessionId ? this.databaseOperations.get(this.activeSessionId) ?? null : null,
        binaryOperation: this.activeSessionId ? this.binaryOperations.get(this.activeSessionId) ?? null : null,
        engineeringOperation: this.activeSessionId ? this.engineeringOperations.get(this.activeSessionId) ?? null : null,
        mediaWorkerTruth: this.mediaWorkerTruth,
        fileOperation: this.activeSessionId ? this.fileOperations.get(this.activeSessionId) ?? null : null,
        operationAudits: this.operationAudits,
        lastError: this.codingError,
        busyAction: this.busyAction,
        lastAction: this.lastAction,
        lastRequestId: this.lastRequestId,
        contextReceipt: this.contextReceipt
      }
    };
  }

  private getCandidateWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders?.length === 1 && folders[0].uri.scheme === "file" ? folders[0].uri.fsPath : undefined;
  }

  private getWorkspaceRoot(): string | undefined {
    return this.workspaceTrust.getStatus(this.repoApproval).canReadWorkspace ? this.getCandidateWorkspaceRoot() : undefined;
  }

  private async safeGitPreview() {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) return null;
    try {
      return await this.api.getGitPreview(workspaceRoot);
    } catch {
      return null;
    }
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
    const preview = this.activeSessionId ? this.filePreviews.get(this.activeSessionId) : undefined;
    try {
      if (!preview || !proposal.diff_preview) throw new Error("Approve a complete selected-file preview before native diff review.");
      await this.diffs.showNativePatchDiff(preview, proposal.diff_preview, proposal.patch_id ?? proposal.patch_hash);
      this.lastAction = `Native diff opened for exact patch ${proposal.patch_hash}.`;
      this.codingError = undefined;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Native patch review unavailable.";
      this.lastAction = "Native diff review failed closed.";
    }
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
