export type ApprovalMode = "read_only" | "plan_only" | "path_preview" | "apply_with_approval" | "test_with_approval";
export type ConnectionState = "unknown" | "connected" | "unavailable" | "authentication_required" | "version_mismatch" | "profile_unavailable" | "degraded";
export type WorkspaceTrustLevel = "no_workspace" | "restricted" | "read_only" | "trusted";
export type WorkspaceTrustMode = "vscode_workspace_trust" | "read_only" | "blocked";
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
  authStatus?: "available" | "missing" | "invalid" | "unsafe_permissions" | "development_not_required";
  apiVersion?: string;
  contractVersion?: string;
  expectedContractVersion?: string;
  developerProfileStatus?: string;
  lastRequestId?: string;
};

export type RepoApprovalStatus = {
  status: "unknown" | "approval_required" | "approved" | "blocked" | "revoked";
  workspaceLabel: string;
  workspaceRootHash?: string;
  approved: boolean;
  revoked: boolean;
  blockedReason?: string;
  approvalSource?: string;
  rawPathExposed: false;
};

export type WorkspaceStatus = {
  trustLevel: WorkspaceTrustLevel;
  workspaceLabel: string;
  workspaceFolders: string[];
  workspaceRootHash?: string;
  vscodeTrusted: boolean;
  trustMode: WorkspaceTrustMode;
  repoApprovalStatus: RepoApprovalStatus["status"];
  repoApproved: boolean;
  blockedReason?: string;
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
  selectedChangedFiles: string[];
};

export type GoalWorkflowState = {
  status: "idle" | "planning" | "approval_required" | "approved_checkpoint_only" | "checkpoint_ready" | "preview_only" | "stopped" | "blocked" | "complete";
  currentGoal?: string;
  taskId?: string;
  taskHash?: string;
  currentStep?: number;
  maxSteps?: number;
  maxMinutes?: number;
  receiptId?: string;
  nextStepLabel?: string;
  autonomyEnabled: boolean;
  pursueGoalEnabled: boolean;
  fullOperatorEnabled: false;
  notes: string[];
};

export type GitStatusSummary = {
  branch: string;
  dirtyState: "unknown" | "clean" | "dirty";
  changedCount: number;
  stagedCount: number;
  unstagedCount: number;
  untrackedCount: number;
  headCommit?: string;
  remotePresent?: boolean;
  repoDetected: boolean;
  approvedRepo: boolean;
  status: string;
  summary: string;
};

export type ChangedFile = {
  path: string;
  state: "modified" | "added" | "deleted" | "renamed" | "copied" | "type_changed" | "unmerged" | "untracked" | "unknown";
  staged: boolean;
  unstaged: boolean;
  selected: boolean;
};

export type CodingGitPreview = {
  status: string;
  repo_detected: boolean;
  approved_repo: boolean;
  branch?: string;
  head_ref?: string;
  head_commit?: string;
  upstream?: string;
  remote_present?: boolean;
  dirty?: boolean;
  changed_count: number;
  staged_count: number;
  unstaged_count: number;
  untracked_count: number;
  changed_files: Array<{
    relative_path: string;
    status: ChangedFile["state"];
    index_status: string;
    working_tree_status: string;
    staged: boolean;
    unstaged: boolean;
  }>;
  workspace_root_hash?: string;
  mutation_allowed: false;
  shell_git_used: false;
  git_command_used: boolean;
  output_truncated: boolean;
  blocked_reason?: string;
  warnings: string[];
};

export type DeveloperProfileStatus = {
  status: string;
  official_addon: boolean;
  listing_state: string;
  public_installable: boolean;
  active: boolean;
  profile_id: string;
  profile_label: string;
  profile_readiness: string;
  codev_install: {
    state: string;
    installed: boolean;
    compatible: boolean;
    version?: string;
    expected_version: string;
    expected_contract_version: string;
    raw_path_exposed: false;
  };
  api_version: string;
  coding_contract_version: string;
  local_auth: { required_for_mutations?: boolean; initialized?: boolean; credential_exposed?: false };
  repo_approval_contract: string;
  command_catalog_contract: string;
  task_lab_contract: string;
  raw_paths_exposed: false;
  warnings: string[];
};

export type CommandCatalogEntry = {
  command_id: string;
  label: string;
  purpose: string;
  command: string[];
  cwd_policy: "approved_repo" | string;
  timeout_seconds: number;
  output_limit_bytes: number;
  execution_enabled: boolean;
  approval_required: true;
  shell: false;
  stdin: "closed";
  network_allowed: false;
  package_install_allowed: false;
  disabled_reason?: string;
};

export type CommandCatalog = {
  contract_version: string;
  entries: CommandCatalogEntry[];
  arbitrary_command_input_allowed: false;
  shell_allowed: false;
  package_manager_mutation_allowed: false;
  git_mutation_allowed: false;
  network_allowed: false;
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
    extension?: string;
    extensions?: string[];
    family?: string;
    media_family?: string;
    mime_types?: string[];
    adapter?: string;
    readable?: boolean;
    extractable?: boolean;
    exportable?: boolean;
    editable?: boolean;
    stable_edit_operations?: string[];
    risk_flags?: Record<string, boolean>;
    capabilities?: Record<string, boolean>;
    notes?: string[];
  };
  safety?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  schema_summary?: Record<string, unknown>;
  preview?: Record<string, unknown>;
  layers?: Array<Record<string, unknown>>;
  bands?: Array<Record<string, unknown>>;
  dimensions?: Array<Record<string, unknown>>;
  variables?: Array<Record<string, unknown>>;
  redaction_count?: number;
  preview_truncated?: boolean;
  dependencies?: Record<string, unknown>;
  text_preview?: string;
  tables?: Array<Record<string, unknown>>;
  outline?: Array<Record<string, unknown>>;
  provenance?: Array<Record<string, unknown>>;
  size_bytes?: number;
  media_family?: string;
  container?: string;
  duration_seconds?: number;
  bitrate_bps?: number;
  stream_count?: number;
  audio?: Record<string, unknown>;
  video?: Record<string, unknown>;
  privacy_flags?: Record<string, boolean>;
  safety_flags?: Record<string, boolean>;
  thumbnail_status?: string;
  thumbnail_data_url?: string;
  thumbnail_path?: string;
  operation_id?: string;
  request_id?: string;
  audit_written?: boolean;
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
  backup_relative_path?: string;
  rollback_receipt_id?: string;
  approval_id?: string;
  request_id?: string;
  operation_id?: string;
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
  command?: string[];
  cwd_label?: string;
  execution_performed: boolean;
  exit_code?: number;
  stdout_preview?: string;
  stderr_preview?: string;
  blocked_reason?: string;
  audit_written: boolean;
  approval_id?: string;
  request_id?: string;
  operation_id?: string;
  started_at_utc?: string;
  finished_at_utc?: string;
  duration_ms?: number;
  output_truncated?: boolean;
  output_sanitized?: boolean;
  warnings: string[];
};

export type CodingCommandPlan = {
  status: string;
  command_id?: string;
  command: string[];
  purpose: string;
  allowlist_match: boolean;
  approval_required: boolean;
  execution_enabled: boolean;
  plan_hash?: string;
  blocked_reason?: string;
  warnings: string[];
};

export type CodingOperationApproval = {
  status: string;
  approval_id: string;
  approval_token?: string;
  operation_kind: string;
  exact_files: string[];
  workspace_root_hash?: string;
  source_hash?: string;
  plan_hash?: string;
  allowed_mutation_class?: string;
  expires_at_utc: string;
  one_time_use: boolean;
  audit_written: boolean;
  request_id?: string;
};

export type CodingOperationAudit = {
  timestamp_utc?: string;
  recorded_at_utc?: string;
  kind?: string;
  status?: string;
  request_id?: string;
  session_id?: string;
  operation_id?: string;
  approval_id?: string;
  operation_kind?: string;
  relative_paths?: string[];
  relative_path?: string;
  source_hash?: string;
  plan_hash?: string;
  result_hash?: string;
  mutation_performed?: boolean;
  shell_execution?: boolean;
  shell?: boolean;
  backup?: Record<string, unknown>;
  audit_persisted?: boolean;
  media_family?: string;
  size_bytes?: number;
  duration_seconds?: number;
  stream_count?: number;
  thumbnail_status?: string;
  privacy_flags_present?: boolean;
  approval_required?: boolean;
  operator_approved?: boolean;
  artifact_id?: string;
  model_id?: string;
  language?: string;
  segment_count?: number;
  text_length?: number;
  voice_id?: string;
  synthetic_media?: boolean;
  production_enabled?: boolean;
  raw_content_logged?: boolean;
  database_engine?: string;
  binary_format?: string;
  snapshot_hash?: string;
  artifact_hash?: string;
  table_count?: number;
  view_count?: number;
  index_count?: number;
  trigger_count?: number;
  schema_object_count?: number;
  section_count?: number;
  import_count?: number;
  export_count?: number;
  symbol_count?: number;
  string_count?: number;
  risk_total?: number;
  policy_version?: string;
  row_data_returned?: boolean;
  arbitrary_sql_executed?: boolean;
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
  plan_hash?: string;
  preview?: string;
  warnings: string[];
  operation_details?: Record<string, unknown>;
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
  approval_id?: string;
  request_id?: string;
  operation_id?: string;
  backup_relative_path?: string;
  rollback_receipt_id?: string;
  warnings: string[];
  operation_details?: Record<string, unknown>;
  rollback_note: string;
};

export type CodingDataPlan = CodingDocumentPlan & {
  transaction?: Record<string, unknown>;
  backup?: Record<string, unknown>;
};

export type CodingDataApplyResult = CodingDocumentApplyResult & {
  transaction?: Record<string, unknown>;
  backup?: Record<string, unknown>;
};

export type CodingFileOperationPlan = {
  status: string;
  operation_kind: string;
  target_relative_path?: string;
  destination_relative_path?: string;
  blocked_reason?: string;
  source_hash?: string;
  plan_hash?: string;
  plan_steps: string[];
  risk_labels: string[];
  warnings: string[];
};

export type CodingFileOperationResult = {
  status: string;
  operation_kind: string;
  target_relative_path?: string;
  destination_relative_path?: string;
  previous_content_hash?: string;
  new_content_hash?: string;
  backup_relative_path?: string;
  rollback_receipt_id?: string;
  mutation_performed: boolean;
  audit_written: boolean;
  blocked_reason?: string;
  rollback_note: string;
  warnings: string[];
  request_id?: string;
};

export type CodingFileOperationState = {
  plan: CodingFileOperationPlan | null;
  result: CodingFileOperationResult | null;
  lastError?: string;
};

export type CodingDocumentOperationState = {
  inspectPreview: FileReadPreview | null;
  extractPreview: FileReadPreview | null;
  exportPlan: CodingDocumentPlan | null;
  editPlan: CodingDocumentPlan | null;
  applyResult: CodingDocumentApplyResult | null;
  lastError?: string;
};

export type CodingDataOperationState = {
  inspectPreview: FileReadPreview | null;
  extractPreview: FileReadPreview | null;
  exportPlan: CodingDataPlan | null;
  mutationPlan: CodingDataPlan | null;
  applyResult: CodingDataApplyResult | null;
  lastError?: string;
};

export type CodingVisualOperationState = {
  inspectPreview: FileReadPreview | null;
  extractPreview: FileReadPreview | null;
  ocrResult: Record<string, unknown> | null;
  analysisResult: Record<string, unknown> | null;
  exportPlan: CodingDocumentPlan | null;
  editPlan: CodingDocumentPlan | null;
  applyResult: CodingDocumentApplyResult | null;
  lastError?: string;
};

export type CodingMediaOperationState = {
  inspectPreview: FileReadPreview | null;
  thumbnailPreview: FileReadPreview | null;
  lastError?: string;
};

export type ArchiveMemberRecord = {
  index: number;
  display_path: string;
  path_hash: string;
  normalized_relative_path?: string;
  kind: string;
  uncompressed_size: number;
  is_regular_file: boolean;
  is_directory: boolean;
  is_symlink: boolean;
  is_hardlink: boolean;
  is_device: boolean;
  is_fifo: boolean;
  is_socket: boolean;
  is_encrypted: boolean;
  is_nested_archive_candidate: boolean;
  extractable: boolean;
  blocked_reason?: string;
  risk_flags: string[];
};

export type ArchiveContainerPreview = {
  status: string;
  operation_id: string;
  request_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  archive_sha256?: string;
  archive_size_bytes: number;
  extension_type: string;
  detected_type: string;
  extension_content_match: boolean;
  descriptor: {
    type_id: string;
    label: string;
    inspection_state: string;
    extraction_state: string;
    package_container: boolean;
    selected_sandbox_extraction_supported: boolean;
    install_state: string;
    execute_state: string;
    tool_license_status: string;
    notes: string[];
  };
  member_count: number;
  directory_count: number;
  projected_uncompressed_bytes: number;
  largest_member_bytes: number;
  nested_archive_count: number;
  compression_ratio: number;
  encrypted: boolean;
  members: ArchiveMemberRecord[];
  member_list_truncated: boolean;
  risk_flags: Array<{ code: string; severity: string; count: number; blocks_extraction: boolean; summary: string }>;
  risk_counts: Record<string, number>;
  package_metadata?: Record<string, unknown>;
  manifest_digest?: string;
  policy_version: string;
  tool_used: string;
  blocked_reason?: string;
  audit_written: boolean;
  warnings: string[];
};

export type ArchiveExtractionPlan = {
  status: string;
  operation_id: string;
  request_id?: string;
  file_label: string;
  relative_path?: string;
  archive_type: string;
  archive_sha256: string;
  archive_size_bytes: number;
  manifest_digest: string;
  selected_member_indexes: number[];
  selected_members_digest: string;
  selected_file_count: number;
  projected_write_bytes: number;
  sandbox_id: string;
  sandbox_destination_hash: string;
  plan_hash: string;
  policy_version: string;
  approval_required: true;
  blocked_reason?: string;
  warnings: string[];
};

export type ArchiveExtractionResult = {
  status: string;
  operation_id: string;
  request_id?: string;
  approval_id?: string;
  archive_type: string;
  archive_sha256: string;
  manifest_digest: string;
  plan_hash: string;
  sandbox_id: string;
  sandbox_destination_hash: string;
  extracted_file_count: number;
  extracted_bytes: number;
  blocked_member_count: number;
  skipped_member_count: number;
  audit_written: boolean;
  mutation_performed: boolean;
  source_mutated: false;
  project_root_written: false;
  install_performed: false;
  execution_performed: false;
  cleanup_performed: boolean;
  blocked_reason?: string;
  warnings: string[];
};

export type CodingArchiveOperationState = {
  inspectPreview: ArchiveContainerPreview | null;
  extractionPlan: ArchiveExtractionPlan | null;
  extractionResult: ArchiveExtractionResult | null;
  lastError?: string;
};

export type DataBinaryArtifactReceipt = {
  artifact_id: string;
  artifact_kind: string;
  sha256: string;
  size_bytes: number;
};

export type DatabaseInspection = {
  status: string;
  operation_id: string;
  request_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  source_sha256?: string;
  source_blake3?: string;
  size_bytes: number;
  extension_type: string;
  detected_engine: string;
  extension_content_match: boolean;
  magic_summary: string;
  descriptor: {
    type_id: string;
    label: string;
    identification_state: string;
    metadata_state: string;
    schema_preview_state: string;
    read_only_open_supported: boolean;
    row_preview_state: string;
    arbitrary_sql_state: string;
    mutation_state: string;
    install_load_state: string;
    notes: string[];
  };
  sidecars: Record<string, { present?: boolean; size_bytes?: number; regular_file?: boolean; symlink?: boolean }>;
  source_state_digest?: string;
  schema_preview_plan_hash?: string;
  artifact?: DataBinaryArtifactReceipt;
  policy_version: string;
  worker_policy_version: string;
  audit_written: boolean;
  blocked_reason?: string;
  warnings: string[];
};

export type DatabaseSchemaPreview = {
  status: string;
  operation_id: string;
  request_id?: string;
  approval_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  detected_engine: string;
  source_sha256: string;
  snapshot_sha256?: string;
  snapshot_strategy?: string;
  table_count: number;
  view_count: number;
  index_count: number;
  trigger_count: number;
  schema_object_count: number;
  risk_counts: Record<string, number>;
  artifact?: DataBinaryArtifactReceipt;
  policy_version: string;
  mutation_performed: boolean;
  row_data_returned: boolean;
  arbitrary_sql_executed: boolean;
  audit_written: boolean;
  blocked_reason?: string;
  warnings: string[];
};

export type BinaryInspection = {
  status: string;
  operation_id: string;
  request_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  source_sha256?: string;
  source_blake3?: string;
  size_bytes: number;
  extension_type: string;
  detected_format: string;
  extension_content_match: boolean;
  magic_summary: string;
  descriptor: {
    type_id: string;
    label: string;
    inspection_state: string;
    static_metadata_only: boolean;
    strings_state: string;
    disassembly_state: string;
    execution_state: string;
    load_state: string;
    install_state: string;
    mutation_state: string;
    patch_state: string;
    notes: string[];
  };
  architecture?: string;
  bitness?: number;
  endianness?: string;
  section_count: number;
  import_count: number;
  export_count: number;
  symbol_count: number;
  string_count: number;
  entropy?: number;
  executable_bit: boolean;
  debug_symbols_present?: boolean;
  stripped?: boolean;
  risk_flags: Array<{ code: string; severity: string; count: number; summary: string }>;
  risk_counts: Record<string, number>;
  artifact?: DataBinaryArtifactReceipt;
  policy_version: string;
  worker_policy_version: string;
  toolchain: string[];
  execution_performed: boolean;
  loading_performed: boolean;
  mutation_performed: boolean;
  audit_written: boolean;
  blocked_reason?: string;
  warnings: string[];
};

export type CodingDatabaseOperationState = {
  inspection: DatabaseInspection | null;
  schemaPreview: DatabaseSchemaPreview | null;
  lastError?: string;
};

export type CodingBinaryOperationState = {
  inspection: BinaryInspection | null;
  lastError?: string;
};

export type EngineeringArtifactReceipt = {
  artifact_id: string;
  artifact_kind: string;
  file_name: string;
  media_type: string;
  sha256: string;
  size_bytes: number;
  local_only: true;
};

export type EngineeringInspection = {
  status: string;
  operation_id: string;
  request_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  source_sha256?: string;
  size_bytes: number;
  extension_type: string;
  detected_type: string;
  extension_content_match: boolean;
  magic_summary: string;
  descriptor: {
    type_id: string;
    label: string;
    family: string;
    forge: string;
    static_inspection_state: string;
    report_state: string;
    preview_state: string;
    conversion_state: string;
    repair_state: string;
    simulation_state: string;
    generation_state: string;
    physical_output_state: string;
    maximum_live_level: number;
    notes: string[];
  };
  report: Record<string, unknown>;
  capability_truth: Record<string, string>;
  risk_flags: Array<{ code: string; severity: string; count: number; summary: string }>;
  risk_counts: Record<string, number>;
  external_references: Array<{ reference_kind: string; display_reference: string; reference_hash: string; scheme: string; resolution_state: string; blocked_reason?: string }>;
  external_reference_count: number;
  artifacts: EngineeringArtifactReceipt[];
  preview_plan_hash?: string;
  preview_kind?: string;
  policy_version: string;
  worker_policy_version: string;
  worker_key: string;
  worker_state: string;
  audit_written: boolean;
  source_mutated: false;
  network_used: false;
  scripts_executed: false;
  plugins_loaded: false;
  physical_output_performed: false;
  blocked_reason?: string;
  warnings: string[];
};

export type EngineeringPreviewPlan = {
  status: string;
  operation_id: string;
  request_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  source_sha256: string;
  size_bytes: number;
  detected_type: string;
  family: string;
  preview_kind: string;
  plan_hash: string;
  policy_version: string;
  approval_required: true;
  artifact?: EngineeringArtifactReceipt;
  blocked_reason?: string;
  warnings: string[];
};

export type EngineeringPreviewResult = {
  status: string;
  operation_id: string;
  request_id?: string;
  approval_id?: string;
  file_label: string;
  relative_path?: string;
  path_hash: string;
  source_sha256: string;
  detected_type: string;
  family: string;
  preview_kind: string;
  plan_hash: string;
  artifact?: EngineeringArtifactReceipt;
  receipt_artifact?: EngineeringArtifactReceipt;
  policy_version: string;
  audit_written: boolean;
  source_mutated: false;
  project_root_written: false;
  network_used: false;
  scripts_executed: false;
  plugins_loaded: false;
  physical_output_performed: false;
  blocked_reason?: string;
  warnings: string[];
};

export type CodingEngineeringOperationState = {
  inspection: EngineeringInspection | null;
  previewPlan: EngineeringPreviewPlan | null;
  previewResult: EngineeringPreviewResult | null;
  lastError?: string;
};

export type MediaWorkerModelTruth = {
  id?: string;
  display_name?: string;
  capability?: string;
  state?: string;
  enabled_state?: string;
  gate_status?: string;
  local_assets_present?: boolean;
  voice_assets_present?: boolean;
  license?: string;
  license_review_status?: string;
  provenance_review_status?: string;
  production_blockers?: string[];
  known_failure_modes?: string[];
  gates?: Record<string, unknown>;
};

export type MediaWorkerTruth = {
  speechforge?: Record<string, unknown> & { models?: MediaWorkerModelTruth[] };
  imageforge?: Record<string, unknown> & { models?: MediaWorkerModelTruth[] };
  videoforge?: Record<string, unknown> & { models?: MediaWorkerModelTruth[] };
  voice_cloning?: Record<string, unknown>;
  gates?: Record<string, unknown>;
  runtime_registry?: Array<Record<string, unknown>>;
};

export type TtsVoice = { id: string; display_name?: string; language?: string; style?: string; enabled?: boolean };

export type SpeechTtsPlan = {
  status: string;
  voice_id: string;
  voice_label?: string;
  text_hash: string;
  text_length: number;
  speed: number;
  purpose_category: string;
  target_relative_path?: string;
  sidecar_relative_path?: string;
  plan_hash?: string;
  model_id?: string;
  voice_cloning_available: false;
  blocked_reason?: string;
  warnings: string[];
};

export type SpeechTtsResult = SpeechTtsPlan & {
  artifact_id?: string;
  output_sha256?: string;
  output_bytes?: number;
  sample_rate_hz?: number;
  duration_seconds?: number;
  audio_data_url?: string;
  operation_id?: string;
  request_id?: string;
  approval_id?: string;
  audit_written: boolean;
};

export type SpeechTranscriptionPlan = {
  status: string;
  file_label: string;
  relative_path?: string;
  target_relative_path?: string;
  sidecar_relative_path?: string;
  source_hash?: string;
  plan_hash?: string;
  model_id?: string;
  duration_seconds?: number;
  output_format: string;
  consent_state: string;
  blocked_reason?: string;
  warnings: string[];
};

export type SpeechTranscriptionResult = SpeechTranscriptionPlan & {
  artifact_id?: string;
  transcript_sha256?: string;
  transcript_bytes?: number;
  segment_count?: number;
  operation_id?: string;
  request_id?: string;
  approval_id?: string;
  audit_written: boolean;
  raw_transcript_returned: false;
};

export type VideoForgePlan = {
  status: string;
  model_id: string;
  model_state: string;
  prompt_hash: string;
  prompt_length: number;
  purpose_category: string;
  width: number;
  height: number;
  frames: number;
  fps: number;
  steps: number;
  seed: number;
  target_relative_path?: string;
  sidecar_relative_path?: string;
  plan_hash?: string;
  synthetic_media: true;
  production_enabled: false;
  approval_required: true;
  cancellation_supported: boolean;
  blocked_reason?: string;
  warnings: string[];
};

export type VideoForgeJob = VideoForgePlan & {
  operation_id: string;
  request_id?: string;
  approval_id?: string;
  artifact_id?: string;
  output_sha256?: string;
  output_bytes?: number;
  duration_seconds?: number;
  runtime_seconds?: number;
  peak_gpu_memory_mib?: number;
  audit_written: boolean;
  cancel_requested: boolean;
  network_used: false;
  cloud_used: false;
};

export type CodingChatReply = {
  assistantText: string;
  patchProposal?: CodingPatchProposal;
  requestId?: string;
  contextReceipt?: {
    selected_metadata?: Array<{ relative_path: string; context_kind: string; scm_status?: string; staged: boolean; source_contents_included: false }>;
    selected_metadata_count?: number;
    approved_source_preview_included?: boolean;
    broad_repo_snapshot_included?: false;
    raw_absolute_paths_included?: false;
  };
};

export type CodingState = {
  bridge: CodingBridgeStatus | null;
  developerProfile: DeveloperProfileStatus | null;
  commandCatalog: CommandCatalog | null;
  repoApproval: RepoApprovalStatus;
  repoPreview: RepoInspectPreview | null;
  filePreview: FileReadPreview | null;
  patchApplyResult: CodingPatchApplyResult | null;
  commandResult: CodingCommandRunResult | null;
  documentOperation: CodingDocumentOperationState | null;
  dataOperation: CodingDataOperationState | null;
  visualOperation: CodingVisualOperationState | null;
  mediaOperation: CodingMediaOperationState | null;
  archiveOperation: CodingArchiveOperationState | null;
  databaseOperation: CodingDatabaseOperationState | null;
  binaryOperation: CodingBinaryOperationState | null;
  engineeringOperation: CodingEngineeringOperationState | null;
  mediaWorkerTruth: MediaWorkerTruth | null;
  fileOperation: CodingFileOperationState | null;
  operationAudits: CodingOperationAudit[];
  lastError?: string;
  busyAction?: "refresh" | "newSession" | "chat" | "repoApproval" | "repoRevoke" | "repoPreview" | "gitStatus" | "filePreview" | "applyPatch" | "runCheck" | "goalPlan" | "goalApprove" | "goalNext" | "goalStop" | "deleteSession" | "clearSessions" | "fileOperationPlan" | "fileOperationApply" | "documentInspect" | "documentExtract" | "documentExportPlan" | "documentExportApply" | "documentEditPlan" | "documentEditApply" | "dataInspect" | "dataPreview" | "dataExportPlan" | "dataExportApply" | "dataMutationPlan" | "dataMutationApply" | "visualInspect" | "visualPreview" | "visualOcr" | "visualAnalysis" | "visualExportPlan" | "visualExportApply" | "visualEditPlan" | "visualEditApply" | "mediaInspect" | "mediaThumbnail" | "archiveInspect" | "archivePlan" | "archiveApply" | "databaseInspect" | "databaseSchema" | "binaryInspect" | "engineeringInspect" | "engineeringPreviewPlan" | "engineeringPreviewApply";
  lastAction?: string;
  lastRequestId?: string;
  contextReceipt?: CodingChatReply["contextReceipt"];
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
  | { type: "toggleChangedFileContext"; path: string }
  | { type: "approveWorkspaceRepo" }
  | { type: "revokeWorkspaceRepo" }
  | { type: "connectDeveloperForge" }
  | { type: "sendSelectedContextToForge" }
  | { type: "requestFullOperatorMode" }
  | { type: "startPlanMode" }
  | { type: "planGoal"; objective: string; maxSteps: number; maxMinutes: number }
  | { type: "approveGoal" }
  | { type: "pursueGoal" }
  | { type: "stopGoal" }
  | { type: "reviewPatchProposal" }
  | { type: "copyPatchDiff" }
  | { type: "discardPatchProposal" }
  | { type: "sendChatMessage"; text: string }
  | { type: "inspectRepoPreview" }
  | { type: "readActiveFilePreview" }
  | { type: "planFileOperation"; operationKind: "create" | "edit" | "replace" | "delete" | "rename" | "move"; targetPath: string; destinationPath?: string; newText?: string }
  | { type: "applyApprovedFileOperation" }
  | { type: "inspectActiveDocument" }
  | { type: "extractActiveDocument" }
  | { type: "planDocumentExport"; exportFormat: "markdown" | "text" }
  | { type: "applyApprovedDocumentExport" }
  | { type: "planDocumentEdit"; operation: string; parameters: Record<string, unknown> }
  | { type: "applyApprovedDocumentEdit" }
  | { type: "inspectActiveData" }
  | { type: "previewActiveData" }
  | { type: "planDataExport"; exportFormat: "markdown" | "json" }
  | { type: "applyApprovedDataExport" }
  | { type: "planDataMutation"; operation: string; parameters: Record<string, unknown> }
  | { type: "applyApprovedDataMutation" }
  | { type: "inspectActiveVisual" }
  | { type: "previewActiveVisual" }
  | { type: "runVisualOcr" }
  | { type: "runVisualAnalysis" }
  | { type: "planVisualExport"; exportFormat: "markdown" | "json" | "png" | "jpg" | "webp" | "tiff" | "svg" }
  | { type: "applyApprovedVisualExport" }
  | { type: "planVisualEdit"; operation: string; parameters: Record<string, unknown> }
  | { type: "applyApprovedVisualEdit" }
  | { type: "inspectActiveMedia" }
  | { type: "thumbnailActiveMedia" }
  | { type: "inspectActiveArchive" }
  | { type: "planArchiveExtraction"; selectedMemberIndexes: number[] }
  | { type: "applyApprovedArchiveExtraction" }
  | { type: "inspectActiveDatabase" }
  | { type: "previewActiveDatabaseSchema" }
  | { type: "inspectActiveBinary" }
  | { type: "inspectActiveEngineering" }
  | { type: "planEngineeringPreview" }
  | { type: "applyApprovedEngineeringPreview" }
  | { type: "applyApprovedPatch" }
  | { type: "runApprovedCheck"; commandId: string };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: WebviewState }
  | { type: "appendMessage"; message: ElysiaMessage }
  | { type: "error"; error: string };
