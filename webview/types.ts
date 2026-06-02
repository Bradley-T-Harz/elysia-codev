export type ApprovalMode = "read_only" | "plan_only" | "patch_preview" | "apply_with_approval" | "test_with_approval";
export type ConnectionState = "unknown" | "connected" | "unavailable";

export type UiSession = {
  id: string;
  title: string;
  workspaceLabel: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  approvalMode: ApprovalMode;
};

export type UiMessage = {
  id: string;
  role: "user" | "elysia" | "system";
  text: string;
  createdAt: string;
};

export type WebviewState = {
  connection: { state: ConnectionState; apiUrl: string; summary: string; checkedAt?: string };
  workspace: {
    trustLevel: string;
    workspaceLabel: string;
    workspaceFolders: string[];
    canReadWorkspace: boolean;
    canProposePatch: boolean;
    canApplyPatch: boolean;
    canRunCommand: boolean;
  };
  sessions: UiSession[];
  activeSessionId: string | null;
  messages: UiMessage[];
  approvalMode: ApprovalMode;
  git: { branch: string; dirtyState: string; changedCount: number; summary: string };
  changedFiles: Array<{ path: string; state: string }>;
  patchPreview: { state: string; summary: string; files: string[]; canApply: false };
};

export type VsCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
