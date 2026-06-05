export type ApprovalMode = "read_only" | "plan_only" | "path_preview" | "apply_with_approval" | "test_with_approval";
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
  workspaceRoot?: string;
  canReadWorkspace: boolean;
  canProposePatch: boolean;
  canApplyPatch: boolean;
  canRunCommand: boolean;
};

export type ApprovalModeCapabilities = {
  canReadApprovedFile: boolean;
  canInspectPaths: boolean;
  canProposePatch: boolean;
  canApplyPatch: boolean;
  canRunChecks: boolean;
  description: string;
};

export type WorkMode = "local" | "developer_forge";

export type WorkModeState = {
  mode: WorkMode;
  forgeConnected: boolean;
  forgeStatus: "not_connected" | "placeholder" | "disabled";
  selectedContextSendAllowed: boolean;
  notes: string[];
};

export type IdeContextSettings = {
  workspaceMetadata: boolean;
  activeFileMetadata: boolean;
  approvedFilePreview: boolean;
  diagnosticsSummary: boolean;
};

export type GoalWorkflowState = {
  status: "idle" | "planning" | "preview_only" | "stopped";
  currentGoal?: string;
  autonomyEnabled: false;
  pursueGoalEnabled: false;
  fullOperatorEnabled: false;
  notes: string[];
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
  canApply: boolean;
  diffPreview?: string;
  patchHash?: string;
  warnings?: string[];
};

export type ActiveFileDescriptor = {
  fileName: string;
  relativePath: string;
  languageId: string;
  scheme: string;
  isDirty: boolean;
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

export type CodingPatchProposal = {
  status: string;
  patch_id: string;
  patch_hash: string;
  expected_content_hash?: string;
  change_summary: string;
  target_files: string[];
  allowed_target_files: string[];
  blocked_target_files: Array<{ path: string; reason: string }>;
  diff_preview?: string;
  truncated: boolean;
  apply_allowed: boolean;
  approval_required_for_apply: boolean;
  rollback_note: string;
  warnings: string[];
};

export type CodingPatchApplyResult = {
  status: string;
  target_relative_path?: string;
  patch_hash: string;
  expected_content_hash: string;
  previous_content_hash?: string;
  new_content_hash?: string;
  mutation_performed: boolean;
  audit_written: boolean;
  blocked_reason?: string;
  rollback_note: string;
  warnings: string[];
};

export type CodingCommandRunResult = {
  status: string;
  run_id?: string;
  command_id: string;
  execution_performed: boolean;
  exit_code?: number;
  stdout_preview?: string;
  stderr_preview?: string;
  blocked_reason?: string;
  audit_written: boolean;
  warnings: string[];
};

export type CodingDocumentPlan = {
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
};

export type CodingDocumentApplyResult = {
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
};

export type CodingDocumentOperationState = {
  inspectPreview: FileReadPreview | null;
  extractPreview: FileReadPreview | null;
  exportPlan: CodingDocumentPlan | null;
  editPlan: CodingDocumentPlan | null;
  applyResult: CodingDocumentApplyResult | null;
  lastError?: string;
};

export type CodingChatReply = {
  assistantText: string;
  patchProposal?: CodingPatchProposal;
};

export type CodingState = {
  bridge: CodingBridgeStatus | null;
  repoPreview: RepoInspectPreview | null;
  filePreview: FileReadPreview | null;
  patchApplyResult: CodingPatchApplyResult | null;
  commandResult: CodingCommandRunResult | null;
  documentOperation: CodingDocumentOperationState | null;
  lastError?: string;
  busyAction?: "refresh" | "newSession" | "chat" | "repoPreview" | "filePreview" | "applyPatch" | "runCheck" | "deleteSession" | "clearSessions" | "documentInspect" | "documentExtract" | "documentExportPlan" | "documentExportApply" | "documentEditPlan" | "documentEditApply";
  lastAction?: string;
};

export type WebviewState = {
  connection: ElysiaConnectionStatus;
  workspace: WorkspaceStatus;
  activeFile: ActiveFileDescriptor | null;
  sessions: ElysiaSession[];
  activeSessionId: string | null;
  messages: ElysiaMessage[];
  approvalMode: ApprovalMode;
  approvalModeCapabilities: ApprovalModeCapabilities;
  workMode: WorkModeState;
  ideContext: IdeContextSettings;
  goalWorkflow: GoalWorkflowState;
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
  | { type: "selectSession"; sessionId: string }
  | { type: "deleteSession"; sessionId: string }
  | { type: "setApprovalMode"; mode: ApprovalMode }
  | { type: "setIdeContext"; settings: IdeContextSettings }
  | { type: "connectDeveloperForge" }
  | { type: "sendSelectedContextToForge" }
  | { type: "requestFullOperatorMode" }
  | { type: "startPlanMode" }
  | { type: "pursueGoal" }
  | { type: "stopGoal" }
  | { type: "reviewPatchProposal" }
  | { type: "copyPatchDiff" }
  | { type: "discardPatchProposal" }
  | { type: "sendChatMessage"; text: string }
  | { type: "inspectRepoPreview" }
  | { type: "readActiveFilePreview" }
  | { type: "inspectActiveDocument" }
  | { type: "extractActiveDocument" }
  | { type: "planDocumentExport"; exportFormat: "markdown" | "text" }
  | { type: "applyApprovedDocumentExport" }
  | { type: "planDocumentEdit"; operation: string; parameters: Record<string, unknown> }
  | { type: "applyApprovedDocumentEdit" }
  | { type: "applyApprovedPatch" }
  | { type: "runApprovedCheck"; commandId: string };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: WebviewState }
  | { type: "appendMessage"; message: ElysiaMessage }
  | { type: "error"; error: string };
