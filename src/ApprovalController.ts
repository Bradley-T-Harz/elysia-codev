import * as vscode from "vscode";
import type { ApprovalMode } from "./types";

export class ApprovalController {
  public getMode(): ApprovalMode {
    return vscode.workspace.getConfiguration("elysia").get<ApprovalMode>("approvalMode", "plan_only");
  }

  public async setMode(mode: ApprovalMode): Promise<void> {
    await vscode.workspace.getConfiguration("elysia").update("approvalMode", mode, vscode.ConfigurationTarget.Workspace);
  }

  public canReadWorkspace(mode = this.getMode()): boolean {
    return ["read_only", "plan_only", "patch_preview", "apply_with_approval", "test_with_approval"].includes(mode);
  }

  public canProposePatch(mode = this.getMode()): boolean {
    return mode === "patch_preview" || mode === "apply_with_approval" || mode === "test_with_approval";
  }

  public canApplyPatch(): false {
    return false;
  }

  public canRunCommand(): false {
    return false;
  }
}
