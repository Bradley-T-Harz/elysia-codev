export type ApprovalMode = "read_only" | "plan_only" | "patch_preview" | "apply_with_approval" | "test_with_approval";
export type ConnectionState = "unknown" | "connected" | "unavailable";

export type UiSession = {
  id: string;
  backendSessionId?: string;
  title: string;
  workspaceLabel: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  approvalMode: ApprovalMode;
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

export type RepoInspectPreview = {
  workspace_label: string;
  workspace_root_hash: string;
  max_depth: number;
  max_entries: number;
  entries_returned: number;
  ignored_entries: string[];
  preview_entries: Array<{ relative_path: string; kind: string; depth: number }>;
  source_contents_included: boolean;
  files_read: string[];
  boundaries: CodingBoundaryFlags;
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
  coding: {
    bridge: CodingBridgeStatus | null;
    repoPreview: RepoInspectPreview | null;
    lastError?: string;
  };
};

export type VsCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
