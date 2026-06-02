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
    provider = new ElysiaSidebarProvider(context, api, sessions, approvals, workspaceTrust, diffs);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Elysia failed to initialize its local coding room provider: ${detail}`);
    throw error;
  }

  registerCommands(context, provider);

  try {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("elysia.codingRoom", provider));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Elysia commands are registered, but the Coding Room view could not register: ${detail}`);
  }
}

export function deactivate(): void {
  // No background workers, shell processes, or network loops to stop in v0.1.0.
}
