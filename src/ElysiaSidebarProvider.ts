import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import { ElysiaApiClient } from "./ElysiaApiClient";
import { FileDiffProvider } from "./FileDiffProvider";
import { SessionStore } from "./SessionStore";
import { WorkspaceTrust } from "./WorkspaceTrust";
import type { ApprovalMode, ElysiaMessage, ExtensionToWebviewMessage, WebviewState, WebviewToExtensionMessage } from "./types";

export class ElysiaSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private activeSessionId: string | null = null;

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
    const session = await this.sessions.newSession(workspace.workspaceLabel, this.approvals.getMode());
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
    const reply = await this.api.sendPlaceholderMessage(text.trim());
    const elysiaMessage: ElysiaMessage = { id: `msg_${Date.now()}_e`, role: "elysia", text: reply, createdAt: new Date().toISOString() };
    await this.sessions.appendMessage(sessionId, elysiaMessage);
    await this.postState();
  }

  private async buildState(): Promise<WebviewState> {
    const sessions = this.sessions.getSessions();
    if (!this.activeSessionId && sessions[0]) {
      this.activeSessionId = sessions[0].id;
    }
    const connection = await this.api.getStatus();
    return {
      connection,
      workspace: this.workspaceTrust.getStatus(),
      sessions,
      activeSessionId: this.activeSessionId,
      messages: this.sessions.getMessages(this.activeSessionId),
      approvalMode: this.approvals.getMode(),
      git: this.diffs.getGitStatusSummary(),
      changedFiles: this.diffs.getChangedFiles(),
      patchPreview: this.diffs.getPatchPreview()
    };
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
