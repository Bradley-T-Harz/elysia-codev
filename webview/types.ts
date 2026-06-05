export type ApprovalMode = "read_only" | "plan_only" | "path_preview" | "apply_with_approval" | "test_with_approval";
export type ConnectionState = "unknown" | "connected" | "unavailable";
export type WorkMode = "local" | "developer_forge";

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

export type ActiveFileDescriptor = {
  fileName: string;
  relativePath: string;
  languageId: string;
  scheme: string;
  isDirty: boolean;
};

export type FileReadPreview = {
  status: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  content_hash?: string;
  byte_hash?: string;
  language_hint?: string;
  file_type_id?: string;
  file_type_label?: string;
  category?: string;
  adapter?: string;
  language_id?: string;
  encoding?: string;
  line_ending?: string;
  line_count?: number;
  byte_count?: number;
  parse_status?: string;
  parse_summary?: Record<string, unknown>;
  risk_flags?: {
    secret_sensitive: boolean;
    generated_sensitive: boolean;
    lockfile: boolean;
    executable_sensitive: boolean;
  };
  capabilities?: {
    readable: boolean;
    writable: boolean;
    patchable: boolean;
    creatable: boolean;
    deletable: boolean;
    renameable: boolean;
  };
  redactions?: string[];
  source_contents_included: boolean;
  content_preview?: string;
  bytes_returned: number;
  lines_returned: number;
  truncated: boolean;
  blocked_reason?: string;
  warnings: string[];
  secret_scan_findings: string[];
  boundaries: CodingBoundaryFlags;
  descriptor?: {
    type_id: string;
    label: string;
    extension: string;
    family: string;
    adapter: string;
    readable: boolean;
    extractable: boolean;
    exportable: boolean;
    editable: boolean;
    stable_edit_operations: string[];
    risk_flags: Record<string, boolean>;
    notes: string[];
  };
  safety?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  text_preview?: string;
  tables?: Array<Record<string, unknown>>;
  outline?: Array<Record<string, unknown>>;
  provenance?: Array<Record<string, unknown>>;
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
    workspaceRoot?: string;
    canReadWorkspace: boolean;
    canProposePatch: boolean;
    canApplyPatch: boolean;
    canRunCommand: boolean;
  };
  activeFile: ActiveFileDescriptor | null;
  sessions: UiSession[];
  activeSessionId: string | null;
  messages: UiMessage[];
  approvalMode: ApprovalMode;
  approvalModeCapabilities: {
    canReadApprovedFile: boolean;
    canInspectPaths: boolean;
    canProposePatch: boolean;
    canApplyPatch: boolean;
    canRunChecks: boolean;
    description: string;
  };
  workMode: {
    mode: WorkMode;
    forgeConnected: boolean;
    forgeStatus: "not_connected" | "placeholder" | "disabled";
    selectedContextSendAllowed: boolean;
    notes: string[];
  };
  ideContext: {
    workspaceMetadata: boolean;
    activeFileMetadata: boolean;
    approvedFilePreview: boolean;
    diagnosticsSummary: boolean;
  };
  goalWorkflow: {
    status: "idle" | "planning" | "preview_only" | "stopped";
    currentGoal?: string;
    autonomyEnabled: false;
    pursueGoalEnabled: false;
    fullOperatorEnabled: false;
    notes: string[];
  };
  git: { branch: string; dirtyState: string; changedCount: number; summary: string };
  changedFiles: Array<{ path: string; state: string }>;
  patchPreview: {
    state: string;
    summary: string;
    files: string[];
    canApply: boolean;
    diffPreview?: string;
    patchHash?: string;
    warnings?: string[];
  };
  coding: {
    bridge: CodingBridgeStatus | null;
    repoPreview: RepoInspectPreview | null;
    filePreview: FileReadPreview | null;
    patchApplyResult: {
      status: string;
      target_relative_path?: string;
      mutation_performed: boolean;
      audit_written: boolean;
      blocked_reason?: string;
      rollback_note: string;
      warnings: string[];
    } | null;
    commandResult: {
      status: string;
      command_id: string;
      execution_performed: boolean;
      exit_code?: number;
      stdout_preview?: string;
      stderr_preview?: string;
      blocked_reason?: string;
      audit_written: boolean;
      warnings: string[];
    } | null;
    documentOperation: {
      inspectPreview: FileReadPreview | null;
      extractPreview: FileReadPreview | null;
      exportPlan: {
        status: string;
        action: string;
        file_label: string;
        relative_path?: string;
        target_relative_path?: string;
        blocked_reason?: string;
        plan_summary: string;
        source_hash?: string;
        preview?: string;
        warnings: string[];
        approval_required: boolean;
      } | null;
      editPlan: {
        status: string;
        action: string;
        file_label: string;
        relative_path?: string;
        target_relative_path?: string;
        blocked_reason?: string;
        plan_summary: string;
        source_hash?: string;
        preview?: string;
        warnings: string[];
        approval_required: boolean;
      } | null;
      applyResult: {
        status: string;
        action: string;
        file_label: string;
        relative_path?: string;
        target_relative_path?: string;
        blocked_reason?: string;
        mutation_performed: boolean;
        audit_written: boolean;
        previous_hash?: string;
        new_hash?: string;
        warnings: string[];
        rollback_note: string;
      } | null;
      lastError?: string;
    } | null;
    lastError?: string;
    busyAction?: "refresh" | "newSession" | "chat" | "repoPreview" | "filePreview" | "applyPatch" | "runCheck" | "deleteSession" | "clearSessions" | "documentInspect" | "documentExtract" | "documentExportPlan" | "documentExportApply" | "documentEditPlan" | "documentEditApply";
    lastAction?: string;
  };
};

export type VsCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
