export type ApprovalMode = "read_only" | "plan_only" | "patch_preview" | "apply_with_approval" | "test_with_approval";
export type ConnectionState = "unknown" | "connected" | "unavailable";
export type WorkspaceTrustLevel = "no_workspace" | "restricted" | "read_only" | "trusted";
export type SessionStatus = "planning" | "active" | "waiting_for_approval" | "complete" | "failed";

export type ElysiaSession = {
  id: string;
  backendSessionId?: string;
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

export type CodingBoundaryFlags = {
  local_only: boolean;
  marketplace_account_required: boolean;
  cloud_upload_allowed: boolean;
  selected_file_read_allowed: boolean;
  patch_proposal_allowed: boolean;
  patch_apply_allowed: boolean;
  command_execution_allowed: boolean;
  test_execution_allowed: boolean;
  git_mutation_allowed: boolean;
  package_manager_allowed: boolean;
  autonomous_loop_allowed: boolean;
  source_contents_included: boolean;
};

export type CodingBridgeStatus = {
  available: boolean;
  contract_version: string;
  local_api_base: string;
  boundaries: CodingBoundaryFlags;
  enabled_endpoints: string[];
  disabled_capabilities: string[];
  notes: string[];
};

export type RepoPreviewEntry = {
  relative_path: string;
  kind: "directory" | "file";
  depth: number;
};

export type RepoInspectPreview = {
  workspace_label: string;
  workspace_root_hash: string;
  max_depth: number;
  max_entries: number;
  entries_returned: number;
  ignored_entries: string[];
  preview_entries: RepoPreviewEntry[];
  source_contents_included: boolean;
  files_read: string[];
  boundaries: CodingBoundaryFlags;
};

export type CodingState = {
  bridge: CodingBridgeStatus | null;
  repoPreview: RepoInspectPreview | null;
  lastError?: string;
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
  coding: CodingState;
};

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "newSession" }
  | { type: "refreshStatus" }
  | { type: "clearSessions" }
  | { type: "setApprovalMode"; mode: ApprovalMode }
  | { type: "sendChatMessage"; text: string }
  | { type: "inspectRepoPreview" };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: WebviewState }
  | { type: "appendMessage"; message: ElysiaMessage }
  | { type: "error"; error: string };
