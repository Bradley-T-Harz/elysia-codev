import * as vscode from "vscode";
import type { ActiveFileDescriptor, ChangedFile, GitStatusSummary, PatchPreview } from "./types";

export class FileDiffProvider {
  private activeFileUriFromEditorOrTab(): vscode.Uri | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.document.isUntitled && editor.document.uri.scheme === "file") {
      return editor.document.uri;
    }

    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    const input = activeTab?.input;
    if (input instanceof vscode.TabInputText && input.uri.scheme === "file") {
      return input.uri;
    }

    return undefined;
  }

  private documentForUri(uri: vscode.Uri): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
  }

  public getGitStatusSummary(): GitStatusSummary {
    const workspaceLabel = vscode.workspace.workspaceFolders?.[0]?.name ?? "No workspace";
    return {
      branch: "Not inspected",
      dirtyState: "unknown",
      changedCount: 0,
      summary: workspaceLabel === "No workspace"
        ? "Open a workspace to view repo status placeholders."
        : "Git status is a placeholder in v0.1.0. No git commands are run by this extension."
    };
  }

  public getChangedFiles(): ChangedFile[] {
    return vscode.workspace.textDocuments
      .filter((document) => !document.isUntitled && document.uri.scheme === "file")
      .slice(0, 8)
      .map((document) => ({ path: vscode.workspace.asRelativePath(document.uri), state: "open" }));
  }

  public getActiveFile(): ActiveFileDescriptor | null {
    const uri = this.activeFileUriFromEditorOrTab();
    if (!uri) return null;
    const document = this.documentForUri(uri);
    return {
      fileName: uri.path.split("/").pop() ?? "active file",
      relativePath: vscode.workspace.asRelativePath(uri, false),
      languageId: document?.languageId ?? "unknown",
      scheme: uri.scheme,
      isDirty: document?.isDirty ?? false
    };
  }

  public getActiveFilePath(): string | undefined {
    return this.activeFileUriFromEditorOrTab()?.fsPath;
  }

  public getActiveFileWorkspaceRoot(): string | undefined {
    const uri = this.activeFileUriFromEditorOrTab();
    if (!uri) return undefined;
    return vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
  }

  public getPatchPreview(): PatchPreview {
    return {
      state: "empty",
      summary: "No patch proposed. Patch application is disabled in this scaffold.",
      files: [],
      canApply: false
    };
  }
}
