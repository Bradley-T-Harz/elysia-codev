export type ApprovalMode = "read_only" | "plan_only" | "patch_preview" | "apply_with_approval" | "test_with_approval";
export type ConnectionState = "unknown" | "connected" | "unavailable";
export type WorkspaceTrustLevel = "no_workspace" | "restricted" | "read_only" | "trusted";
export type SessionStatus = "planning" | "active" | "waiting_for_approval" | "complete" | "failed";

export type ElysiaSession = {
  id: string;
  title: string;
  workspaceLabel: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  approvalMode: ApprovalMode;
};

export type ElysiaMessage = {
  id: string;
  role: "user" | "elysia" | "system";
  text: string;
  createdAt: string;
};

export type ElysiaConnectionStatus = {
  state: ConnectionState;
  apiUrl: string;
  summary: string;
  checkedAt?: string;
};

export type WorkspaceStatus = {
  trustLevel: WorkspaceTrustLevel;
  workspaceLabel: string;
  workspaceFolders: string[];
  canReadWorkspace: boolean;
  canProposePatch: boolean;
  canApplyPatch: boolean;
  canRunCommand: boolean;
};

export type GitStatusSummary = {
  branch: string;
  dirtyState: "unknown" | "clean" | "dirty";
  changedCount: number;
  summary: string;
};

export type ChangedFile = {
  path: string;
  state: "open" | "changed" | "proposed" | "unknown";
};

export type PatchPreview = {
  state: "empty" | "planned" | "available";
  summary: string;
  files: string[];
  canApply: false;
};

export type WebviewState = {
  connection: ElysiaConnectionStatus;
  workspace: WorkspaceStatus;
  sessions: ElysiaSession[];
  activeSessionId: string | null;
  messages: ElysiaMessage[];
  approvalMode: ApprovalMode;
  git: GitStatusSummary;
  changedFiles: ChangedFile[];
  patchPreview: PatchPreview;
};

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "newSession" }
  | { type: "refreshStatus" }
  | { type: "clearSessions" }
  | { type: "setApprovalMode"; mode: ApprovalMode }
  | { type: "sendChatMessage"; text: string };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: WebviewState }
  | { type: "appendMessage"; message: ElysiaMessage }
  | { type: "error"; error: string };
