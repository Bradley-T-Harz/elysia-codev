import * as vscode from "vscode";
import type { ApprovalMode, ApprovalModeCapabilities } from "./types";

const modeCapabilities: Record<ApprovalMode, ApprovalModeCapabilities> = {
  read_only: {
    canReadApprovedFile: true,
    canInspectPaths: false,
    canProposePatch: false,
    canApplyPatch: false,
    canRunChecks: false,
    description: "Read only: Elysia may explain approved file previews. No patches, mutation, or checks."
  },
  plan_only: {
    canReadApprovedFile: true,
    canInspectPaths: false,
    canProposePatch: false,
    canApplyPatch: false,
    canRunChecks: false,
    description: "Plan only: Elysia may reason and outline changes. No apply-ready patch, mutation, or checks."
  },
  path_preview: {
    canReadApprovedFile: true,
    canInspectPaths: true,
    canProposePatch: false,
    canApplyPatch: false,
    canRunChecks: false,
    description: "Path preview: Elysia may inspect bounded workspace metadata and approved previews only."
  },
  apply_with_approval: {
    canReadApprovedFile: true,
    canInspectPaths: true,
    canProposePatch: true,
    canApplyPatch: true,
    canRunChecks: false,
    description: "Apply with approval: Elysia may propose patches; apply requires explicit local approval."
  },
  test_with_approval: {
    canReadApprovedFile: true,
    canInspectPaths: true,
    canProposePatch: true,
    canApplyPatch: true,
    canRunChecks: true,
    description: "Test with approval: apply-with-approval plus the exact read-only diff check after approval."
  }
};

function normalizeMode(mode: unknown): ApprovalMode {
  if (mode === "patch_preview") return "path_preview";
  if (typeof mode === "string" && mode in modeCapabilities) return mode as ApprovalMode;
  return "plan_only";
}

export class ApprovalController {
  public getMode(): ApprovalMode {
    return normalizeMode(vscode.workspace.getConfiguration("elysia").get<ApprovalMode>("approvalMode", "plan_only"));
  }

  public async setMode(mode: ApprovalMode): Promise<void> {
    await vscode.workspace.getConfiguration("elysia").update("approvalMode", normalizeMode(mode), vscode.ConfigurationTarget.Workspace);
  }

  public getCapabilities(mode = this.getMode()): ApprovalModeCapabilities {
    return modeCapabilities[normalizeMode(mode)];
  }

  public canReadWorkspace(mode = this.getMode()): boolean {
    return this.getCapabilities(mode).canReadApprovedFile;
  }

  public canProposePatch(mode = this.getMode()): boolean {
    return this.getCapabilities(mode).canProposePatch;
  }

  public canInspectPaths(mode = this.getMode()): boolean {
    return this.getCapabilities(mode).canInspectPaths;
  }

  public canApplyPatch(mode = this.getMode()): boolean {
    return this.getCapabilities(mode).canApplyPatch;
  }

  public canRunCommand(mode = this.getMode()): boolean {
    return this.getCapabilities(mode).canRunChecks;
  }
}
