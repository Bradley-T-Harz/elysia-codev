import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import type { WorkspaceStatus, WorkspaceTrustLevel } from "./types";

export class WorkspaceTrust {
  public constructor(private readonly approvals: ApprovalController) {}

  public getStatus(): WorkspaceStatus {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const trusted = vscode.workspace.isTrusted;
    const trustLevel: WorkspaceTrustLevel = folders.length === 0 ? "no_workspace" : trusted ? "trusted" : "restricted";
    const approvalMode = this.approvals.getMode();
    return {
      trustLevel,
      workspaceLabel: folders[0]?.name ?? "No workspace",
      workspaceFolders: folders.map((folder) => folder.name),
      workspaceRoot: folders[0]?.uri.fsPath,
      canReadWorkspace: trusted && this.approvals.canReadWorkspace(approvalMode),
      canProposePatch: trusted && this.approvals.canProposePatch(approvalMode),
      canApplyPatch: false,
      canRunCommand: false
    };
  }
}
