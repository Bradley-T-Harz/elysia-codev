import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import { ElysiaApiClient } from "./ElysiaApiClient";
import { ElysiaSidebarProvider } from "./ElysiaSidebarProvider";
import { FileDiffProvider } from "./FileDiffProvider";
import { registerCommands } from "./commands";
import { SessionStore } from "./SessionStore";
import { WorkspaceTrust } from "./WorkspaceTrust";

export function activate(context: vscode.ExtensionContext): void {
  let provider: ElysiaSidebarProvider;

  try {
    const api = new ElysiaApiClient();
    const sessions = new SessionStore(context);
    const approvals = new ApprovalController();
    const workspaceTrust = new WorkspaceTrust(approvals);
    const diffs = new FileDiffProvider();
    diffs.register(context);
    provider = new ElysiaSidebarProvider(context, api, sessions, approvals, workspaceTrust, diffs);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Elysia failed to initialize its local coding room provider: ${detail}`);
    throw error;
  }

  registerCommands(context, provider);
  // Installation and service discovery never depend on a repository or its
  // trust state. This refresh only reads local capability truth.
  void provider.refreshConnection();
  const connectionTimer = setInterval(() => { if (vscode.window.state.focused) void provider.refreshConnection(); }, 5000);
  context.subscriptions.push({ dispose: () => clearInterval(connectionTimer) });
  context.subscriptions.push(vscode.window.onDidChangeWindowState(state => { if (state.focused) void provider.refreshConnection(); }));

  try {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("elysia.codingRoom", provider));
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => void provider.refresh()),
      vscode.workspace.onDidGrantWorkspaceTrust(() => void provider.refresh()),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("elysia")) void provider.refresh();
      }),
      vscode.window.onDidChangeActiveTextEditor(() => void provider.refreshLocalState())
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Elysia commands are registered, but the Coding Room view could not register: ${detail}`);
  }
}

export function deactivate(): void {
  // Disposables stop client refreshes; the installed Core owns its lifecycle.
}
