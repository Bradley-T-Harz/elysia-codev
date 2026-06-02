import * as vscode from "vscode";
import type { ChangedFile, GitStatusSummary, PatchPreview } from "./types";

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

  public getPatchPreview(): PatchPreview {
    return {
      state: "empty",
      summary: "No patch proposed. Patch application is disabled in this scaffold.",
      files: [],
      canApply: false
    };
  }
}
