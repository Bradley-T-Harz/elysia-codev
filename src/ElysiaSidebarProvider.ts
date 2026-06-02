import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import { ElysiaApiClient } from "./ElysiaApiClient";
import { FileDiffProvider } from "./FileDiffProvider";
import { SessionStore } from "./SessionStore";
import { WorkspaceTrust } from "./WorkspaceTrust";
import type { ApprovalMode, CodingBridgeStatus, ElysiaMessage, ExtensionToWebviewMessage, RepoInspectPreview, WebviewState, WebviewToExtensionMessage } from "./types";

export class ElysiaSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private activeSessionId: string | null = null;
  private codingBridge: CodingBridgeStatus | null = null;
  private repoPreview: RepoInspectPreview | null = null;
  private codingError: string | undefined;

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
    await this.postState();
  }

  public async createSession(): Promise<void> {
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
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Unable to start local Elysia coding session.";
    }
    const session = await this.sessions.newSession(workspace.workspaceLabel, this.approvals.getMode(), backendSessionId);
    this.activeSessionId = session.id;
    await this.postState();
  }

  public async clearSessions(): Promise<void> {
    await this.sessions.clear();
    this.activeSessionId = null;
    await this.postState();
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    if (message.type === "ready" || message.type === "refreshStatus") {
      await this.postState();
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
    }
  }

  private async sendChatMessage(text: string): Promise<void> {
    if (!text.trim()) return;
    if (!this.activeSessionId) {
      await this.createSession();
    }
    const sessionId = this.activeSessionId;
    if (!sessionId) return;
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
    } catch (error) {
      reply = `Local Elysia coding bridge unavailable. Your message stayed inside the VS Code companion shell: ${error instanceof Error ? error.message : text.trim()}`;
      this.codingError = error instanceof Error ? error.message : "Local Elysia coding bridge unavailable.";
    }
    const elysiaMessage: ElysiaMessage = { id: `msg_${Date.now()}_e`, role: "elysia", text: reply, createdAt: new Date().toISOString() };
    await this.sessions.appendMessage(sessionId, elysiaMessage);
    await this.postState();
  }

  private async inspectRepoPreview(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.codingError = "No trusted workspace folder is available for repo preview.";
      await this.postState();
      return;
    }
    const session = this.sessions.getSessions().find((item) => item.id === this.activeSessionId);
    try {
      this.repoPreview = await this.api.inspectRepoPreview({
        workspace_root: workspaceRoot,
        session_id: session?.backendSessionId,
        max_depth: 3,
        max_entries: 80
      });
      this.codingError = undefined;
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Repo preview failed.";
    }
    await this.postState();
  }

  private async buildState(): Promise<WebviewState> {
    const sessions = this.sessions.getSessions();
    if (!this.activeSessionId && sessions[0]) {
      this.activeSessionId = sessions[0].id;
    }
    const connection = await this.api.getStatus();
    try {
      this.codingBridge = await this.api.getCodingStatus();
    } catch (error) {
      this.codingError = error instanceof Error ? error.message : "Local Elysia coding bridge unavailable.";
    }
    return {
      connection,
      workspace: this.workspaceTrust.getStatus(),
      sessions,
      activeSessionId: this.activeSessionId,
      messages: this.sessions.getMessages(this.activeSessionId),
      approvalMode: this.approvals.getMode(),
      git: this.diffs.getGitStatusSummary(),
      changedFiles: this.diffs.getChangedFiles(),
      patchPreview: this.diffs.getPatchPreview(),
      coding: {
        bridge: this.codingBridge,
        repoPreview: this.repoPreview,
        lastError: this.codingError
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
