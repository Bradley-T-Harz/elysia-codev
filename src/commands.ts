import * as vscode from "vscode";
import { ElysiaSidebarProvider } from "./ElysiaSidebarProvider";

export function registerCommands(context: vscode.ExtensionContext, provider: ElysiaSidebarProvider): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("elysia.openCodingRoom", async () => {
      try {
        await vscode.commands.executeCommand("workbench.view.extension.elysia");
        await vscode.commands.executeCommand("elysia.codingRoom.focus");
        await provider.refresh();
        void vscode.window.showInformationMessage("Elysia Coding Room is registered. If it is not visible, open the Elysia Activity Bar icon and choose Coding Room.");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        void vscode.window.showInformationMessage(`Elysia Coding Room command is registered, but VS Code could not focus it automatically: ${detail}`);
      }
    }),
    vscode.commands.registerCommand("elysia.newSession", async () => provider.createSession()),
    vscode.commands.registerCommand("elysia.refreshConnection", async () => provider.refresh()),
    vscode.commands.registerCommand("elysia.trustWorkspace", async () => {
      if (!vscode.workspace.isTrusted) {
        await vscode.commands.executeCommand("workbench.trust.manage");
      }
      await provider.refresh();
    }),
    vscode.commands.registerCommand("elysia.approveWorkspace", async () => provider.approveWorkspaceRepo()),
    vscode.commands.registerCommand("elysia.revokeWorkspace", async () => provider.revokeWorkspaceRepo()),
    vscode.commands.registerCommand("elysia.clearSessions", async () => provider.clearSessions())
  );
}
