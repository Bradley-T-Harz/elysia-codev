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
  execution_performed: boolean;
  exit_code?: number;
  stdout_preview?: string;
  stderr_preview?: string;
  blocked_reason?: string;
  audit_written: boolean;
  approval_id?: string;
  request_id?: string;
  operation_id?: string;
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
};

export type CodingState = {
  bridge: CodingBridgeStatus | null;
  repoPreview: RepoInspectPreview | null;
  filePreview: FileReadPreview | null;
  patchApplyResult: CodingPatchApplyResult | null;
  commandResult: CodingCommandRunResult | null;
  documentOperation: CodingDocumentOperationState | null;
  dataOperation: CodingDataOperationState | null;
  visualOperation: CodingVisualOperationState | null;
  mediaOperation: CodingMediaOperationState | null;
  mediaWorkerTruth: MediaWorkerTruth | null;
  fileOperation: CodingFileOperationState | null;
  operationAudits: CodingOperationAudit[];
  lastError?: string;
  busyAction?: "refresh" | "newSession" | "chat" | "repoPreview" | "filePreview" | "applyPatch" | "runCheck" | "deleteSession" | "clearSessions" | "fileOperationPlan" | "fileOperationApply" | "documentInspect" | "documentExtract" | "documentExportPlan" | "documentExportApply" | "documentEditPlan" | "documentEditApply" | "dataInspect" | "dataPreview" | "dataExportPlan" | "dataExportApply" | "dataMutationPlan" | "dataMutationApply" | "visualInspect" | "visualPreview" | "visualOcr" | "visualAnalysis" | "visualExportPlan" | "visualExportApply" | "visualEditPlan" | "visualEditApply" | "mediaInspect" | "mediaThumbnail";
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
  | { type: "applyApprovedPatch" }
  | { type: "runApprovedCheck"; commandId: string };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: WebviewState }
  | { type: "appendMessage"; message: ElysiaMessage }
  | { type: "error"; error: string };
