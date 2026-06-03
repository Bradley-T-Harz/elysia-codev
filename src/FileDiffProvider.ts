import * as vscode from "vscode";
import type { ActiveFileDescriptor, ChangedFile, GitStatusSummary, PatchPreview } from "./types";

export class FileDiffProvider {
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
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.isUntitled) return null;
    const document = editor.document;
    return {
      fileName: document.uri.path.split("/").pop() ?? "active file",
      relativePath: vscode.workspace.asRelativePath(document.uri, false),
      languageId: document.languageId,
      scheme: document.uri.scheme,
      isDirty: document.isDirty
    };
  }

  public getActiveFilePath(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.isUntitled || editor.document.uri.scheme !== "file") return undefined;
    return editor.document.uri.fsPath;
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
