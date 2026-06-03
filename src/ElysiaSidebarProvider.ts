import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import { ElysiaApiClient } from "./ElysiaApiClient";
import { FileDiffProvider } from "./FileDiffProvider";
import { SessionStore } from "./SessionStore";
import { WorkspaceTrust } from "./WorkspaceTrust";
import type { ApprovalMode, CodingBridgeStatus, ElysiaMessage, ExtensionToWebviewMessage, FileReadPreview, RepoInspectPreview, WebviewState, WebviewToExtensionMessage } from "./types";

export class ElysiaSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private activeSessionId: string | null = null;
  private codingBridge: CodingBridgeStatus | null = null;
  private repoPreviews = new Map<string, RepoInspectPreview>();
  private filePreviews = new Map<string, FileReadPreview>();
  private codingError: string | undefined;
  private busyAction: WebviewState["coding"]["busyAction"];
  private lastAction: string | undefined;

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
    let reply: string;
    try {
      reply = await this.api.sendCodingChat({
        session_id: session?.backendSessionId,
        message: text.trim(),
        workspace_label: session?.workspaceLabel,
        approval_mode: this.approvals.getMode()
      });
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
      this.codingError = "No trusted file-backed active editor is available for file preview.";
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
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Selected-file preview failed.";
      this.lastAction = "Selected-file preview failed.";
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
      git: this.diffs.getGitStatusSummary(),
      changedFiles: this.diffs.getChangedFiles(),
      patchPreview: this.diffs.getPatchPreview(),
      coding: {
        bridge: this.codingBridge,
        repoPreview: activePreview,
        filePreview: activeFilePreview,
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
