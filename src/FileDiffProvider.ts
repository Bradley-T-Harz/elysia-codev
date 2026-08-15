import * as vscode from "vscode";
import * as path from "node:path";
import type { ActiveFileDescriptor, ChangedFile, CodingGitPreview, FileReadPreview, GitStatusSummary, PatchPreview } from "./types";
import { applyUnifiedDiffPreview } from "./unifiedDiffPreview";

const DIFF_SCHEME = "elysia-codev-patch";

export class FileDiffProvider implements vscode.TextDocumentContentProvider {
  private readonly documents = new Map<string, string>();
  private gitSummary: GitStatusSummary = {
    branch: "Not inspected",
    dirtyState: "unknown",
    changedCount: 0,
    stagedCount: 0,
    unstagedCount: 0,
    untrackedCount: 0,
    repoDetected: false,
    approvedRepo: false,
    status: "not_inspected",
    summary: "Approve a trusted repository to load read-only Git truth."
  };
  private changedFiles: ChangedFile[] = [];

  public provideTextDocumentContent(uri: vscode.Uri): string {
    return this.documents.get(uri.toString()) ?? "Patch preview unavailable.";
  }

  public register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(DIFF_SCHEME, this));
  }

  private activeFileUriFromEditorOrTab(): vscode.Uri | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.document.isUntitled && editor.document.uri.scheme === "file") return editor.document.uri;
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    return input instanceof vscode.TabInputText && input.uri.scheme === "file" ? input.uri : undefined;
  }

  private documentForUri(uri: vscode.Uri): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
  }

  public setGitPreview(preview: CodingGitPreview | null, selectedPaths: string[]): void {
    if (!preview) {
      this.gitSummary = {
        branch: "Not inspected",
        dirtyState: "unknown",
        changedCount: 0,
        stagedCount: 0,
        unstagedCount: 0,
        untrackedCount: 0,
        repoDetected: false,
        approvedRepo: false,
        status: "not_inspected",
        summary: "Approve a trusted repository to load read-only Git truth."
      };
      this.changedFiles = [];
      return;
    }
    this.gitSummary = {
      branch: preview.branch ?? "Detached / unborn",
      dirtyState: preview.dirty === undefined ? "unknown" : preview.dirty ? "dirty" : "clean",
      changedCount: preview.changed_count,
      stagedCount: preview.staged_count,
      unstagedCount: preview.unstaged_count,
      untrackedCount: preview.untracked_count,
      headCommit: preview.head_commit,
      remotePresent: preview.remote_present,
      repoDetected: preview.repo_detected,
      approvedRepo: preview.approved_repo,
      status: preview.status,
      summary: preview.blocked_reason
        ? `Git truth blocked: ${preview.blocked_reason}.`
        : `Read-only SCM truth; ${preview.changed_count} changed file(s), no Git mutation authority.`
    };
    const selected = new Set(selectedPaths);
    this.changedFiles = preview.changed_files.map((item) => ({
      path: item.relative_path,
      state: item.status,
      staged: item.staged,
      unstaged: item.unstaged,
      selected: selected.has(item.relative_path)
    }));
  }

  public getGitStatusSummary(): GitStatusSummary {
    return this.gitSummary;
  }

  public getChangedFiles(): ChangedFile[] {
    return this.changedFiles;
  }

  public getActiveFile(): ActiveFileDescriptor | null {
    const uri = this.activeFileUriFromEditorOrTab();
    if (!uri) return null;
    const document = this.documentForUri(uri);
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    const relativePath = folder
      ? path.relative(folder.uri.fsPath, uri.fsPath).split(path.sep).join("/")
      : uri.path.split("/").pop() ?? "active file";
    return {
      fileName: uri.path.split("/").pop() ?? "active file",
      relativePath,
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

  public async showNativePatchDiff(preview: FileReadPreview, diffText: string, patchId: string): Promise<void> {
    if (!preview.content_preview || preview.truncated || !preview.relative_path) {
      throw new Error("Native diff requires a complete approved file preview.");
    }
    const sourceUri = this.activeFileUriFromEditorOrTab();
    const folder = sourceUri ? vscode.workspace.getWorkspaceFolder(sourceUri) : undefined;
    const relativePath = sourceUri && folder
      ? path.relative(folder.uri.fsPath, sourceUri.fsPath).split(path.sep).join("/")
      : undefined;
    if (!sourceUri || !relativePath || relativePath !== preview.relative_path) {
      throw new Error("Open the exact approved patch target before native diff review.");
    }
    const proposed = applyUnifiedDiffPreview(preview.content_preview, diffText);
    const safeId = patchId.replace(/[^a-zA-Z0-9_-]/g, "");
    const proposedUri = vscode.Uri.parse(`${DIFF_SCHEME}:/${safeId}/${encodeURIComponent(preview.file_label)}?proposed`);
    this.documents.set(proposedUri.toString(), proposed);
    await vscode.commands.executeCommand(
      "vscode.diff",
      sourceUri,
      proposedUri,
      `Codev patch review · ${preview.file_label}`,
      { preview: true }
    );
  }

  public getPatchPreview(): PatchPreview {
    return { state: "empty", summary: "No exact patch proposal is active.", files: [], canApply: false };
  }
}
