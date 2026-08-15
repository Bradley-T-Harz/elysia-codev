import * as vscode from "vscode";
import { ApprovalController } from "./ApprovalController";
import type { RepoApprovalStatus, WorkspaceStatus, WorkspaceTrustLevel, WorkspaceTrustMode } from "./types";

const UNKNOWN_APPROVAL: RepoApprovalStatus = {
  status: "unknown",
  workspaceLabel: "No workspace",
  approved: false,
  revoked: false,
  rawPathExposed: false
};

function normalizeTrustMode(value: unknown): WorkspaceTrustMode {
  return value === "read_only" || value === "blocked" ? value : "vscode_workspace_trust";
}

export class WorkspaceTrust {
  public constructor(private readonly approvals: ApprovalController) {}

  public getMode(): WorkspaceTrustMode {
    return normalizeTrustMode(
      vscode.workspace.getConfiguration("elysia").get<WorkspaceTrustMode>("workspaceTrustMode", "vscode_workspace_trust")
    );
  }

  public getStatus(repoApproval: RepoApprovalStatus = UNKNOWN_APPROVAL): WorkspaceStatus {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const vscodeTrusted = vscode.workspace.isTrusted;
    const trustMode = this.getMode();
    const repoApproved = repoApproval.approved && !repoApproval.revoked;
    let trustLevel: WorkspaceTrustLevel;
    if (folders.length === 0) trustLevel = "no_workspace";
    else if (!vscodeTrusted || trustMode === "blocked") trustLevel = "restricted";
    else if (!repoApproved || trustMode === "read_only") trustLevel = "read_only";
    else trustLevel = "trusted";

    const approvalMode = this.approvals.getMode();
    const baseRead = vscodeTrusted && repoApproved && trustMode !== "blocked";
    const mutationEligible = baseRead && trustMode === "vscode_workspace_trust";
    return {
      trustLevel,
      workspaceLabel: folders[0]?.name ?? "No workspace",
      workspaceFolders: folders.map((folder) => folder.name),
      workspaceRootHash: repoApproval.workspaceRootHash,
      vscodeTrusted,
      trustMode,
      repoApprovalStatus: repoApproval.status,
      repoApproved,
      blockedReason:
        trustMode === "blocked"
          ? "workspace_trust_mode_blocked"
          : !vscodeTrusted && folders.length
            ? "vscode_workspace_untrusted"
            : !repoApproved && folders.length
              ? repoApproval.blockedReason ?? "elysia_repo_approval_required"
              : undefined,
      canReadWorkspace: baseRead && this.approvals.canReadWorkspace(approvalMode),
      canProposePatch: mutationEligible && this.approvals.canProposePatch(approvalMode),
      canApplyPatch: mutationEligible && this.approvals.canApplyPatch(approvalMode),
      canRunCommand: mutationEligible && this.approvals.canRunCommand(approvalMode)
    };
  }
}
