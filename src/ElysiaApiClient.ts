import * as http from "node:http";
import * as https from "node:https";
import * as vscode from "vscode";
import { buildLoopbackUrl } from "./localUrlPolicy";
import type {
  CodingBridgeStatus,
  ArchiveContainerPreview,
  ArchiveExtractionPlan,
  ArchiveExtractionResult,
  CodingChatReply,
  CodingCommandPlan,
  CodingCommandRunResult,
  CodingDataApplyResult,
  CodingDataPlan,
  CodingDocumentApplyResult,
  CodingDocumentPlan,
  CodingPatchApplyResult,
  CodingPatchProposal,
  CodingOperationApproval,
  CodingOperationAudit,
  ElysiaConnectionStatus,
  FileReadPreview,
  CodingFileOperationPlan,
  CodingFileOperationResult,
  MediaWorkerTruth,
  SpeechTranscriptionPlan,
  SpeechTranscriptionResult,
  SpeechTtsPlan,
  SpeechTtsResult,
  TtsVoice,
  VideoForgeJob,
  VideoForgePlan,
  RepoInspectPreview
} from "./types";

type Envelope<T> = {
  status?: string;
  request_id?: string;
  data?: T;
  errors?: string[];
  detail?: unknown;
};

type CodingStatusData = { coding_bridge?: CodingBridgeStatus };
type SessionData = { session?: { session_id: string } };
type ChatData = { coding_chat?: { assistant_text: string; plan?: string[]; refused_capabilities?: string[]; patch_proposal?: CodingPatchProposal } };
type RepoPreviewData = { repo_preview?: RepoInspectPreview };
type FilePreviewData = { file_preview?: FileReadPreview };
type DocumentPreviewData = { document?: FileReadPreview };
type DocumentExportPlanData = { document_export_plan?: CodingDocumentPlan };
type DocumentExportResultData = { document_export_result?: CodingDocumentApplyResult };
type DocumentEditPlanData = { document_edit_plan?: CodingDocumentPlan };
type DocumentEditResultData = { document_edit_result?: CodingDocumentApplyResult };
type DataPreviewData = { data?: FileReadPreview };
type DataExportPlanData = { data_export_plan?: CodingDataPlan };
type DataExportResultData = { data_export_result?: CodingDataApplyResult };
type DataMutationPlanData = { data_mutation_plan?: CodingDataPlan };
type DataMutationResultData = { data_mutation_result?: CodingDataApplyResult };
type VisualPreviewData = { visual?: FileReadPreview };
type VisualOcrData = { ocr?: Record<string, unknown> };
type VisualAnalysisData = { analysis?: Record<string, unknown> };
type VisualExportPlanData = { visual_export_plan?: CodingDocumentPlan };
type VisualExportResultData = { visual_export_result?: CodingDocumentApplyResult };
type VisualEditPlanData = { visual_edit_plan?: CodingDocumentPlan };
type VisualEditResultData = { visual_apply_result?: CodingDocumentApplyResult };
type MediaPreviewData = { media?: FileReadPreview };
type ArchivePreviewData = { archive?: ArchiveContainerPreview };
type ArchivePlanData = { archive_extraction_plan?: ArchiveExtractionPlan };
type ArchiveResultData = { archive_extraction_result?: ArchiveExtractionResult };
type MediaWorkerTruthData = { media_workers?: MediaWorkerTruth };
type TtsVoiceData = { voices?: TtsVoice[]; voice_cloning_available?: boolean };
type SpeechTtsPlanData = { tts_plan?: SpeechTtsPlan };
type SpeechTtsResultData = { tts_result?: SpeechTtsResult };
type SpeechTranscriptionPlanData = { transcription_plan?: SpeechTranscriptionPlan };
type SpeechTranscriptionResultData = { transcription_result?: SpeechTranscriptionResult };
type VideoForgePlanData = { videoforge_plan?: VideoForgePlan };
type VideoForgeJobData = { videoforge_job?: VideoForgeJob };
type PatchApplyData = { patch_apply?: CodingPatchApplyResult };
type CommandRunData = { command_run?: CodingCommandRunResult };
type CommandPlanData = { command_plan?: CodingCommandPlan };
type OperationApprovalData = { operation_approval?: CodingOperationApproval };
type OperationAuditData = { operation_audits?: CodingOperationAudit[] };
type FileOperationPlanData = { file_operation_plan?: CodingFileOperationPlan };
type FileOperationResultData = { file_operation_result?: CodingFileOperationResult };
type LocalRequestInit = {
  method: "GET" | "POST";
  body?: string;
};

type LocalResponse = {
  ok: boolean;
  status: number;
  body: string;
};

export class ElysiaApiClient {
  public get apiUrl(): string {
    return vscode.workspace.getConfiguration("elysia").get<string>("apiUrl", "http://127.0.0.1:8000");
  }

  public async getStatus(): Promise<ElysiaConnectionStatus> {
    const apiUrl = this.apiUrl.replace(/\/$/, "");
    try {
      const data = await this.getCodingStatus();
      const contract = data?.contract_version ? ` (${data.contract_version})` : "";
      return { state: "connected", apiUrl, summary: `Local Elysia coding bridge reachable${contract}.`, checkedAt: new Date().toISOString() };
    } catch (error) {
      return { state: "unavailable", apiUrl, summary: error instanceof Error ? error.message : "Local Elysia API unavailable.", checkedAt: new Date().toISOString() };
    }
  }

  public async getCodingStatus(): Promise<CodingBridgeStatus> {
    const envelope = await this.request<CodingStatusData>("/coding/status", { method: "GET" });
    if (!envelope.data?.coding_bridge) {
      throw new Error("Local Elysia coding status response did not include coding_bridge.");
    }
    return envelope.data.coding_bridge;
  }

  public async startCodingSession(request: { workspace_label: string; workspace_root?: string; approval_mode: string }): Promise<string> {
    const envelope = await this.request<SessionData>("/coding/session/start", {
      method: "POST",
      body: JSON.stringify({ ...request, source: "vscode" })
    });
    const sessionId = envelope.data?.session?.session_id;
    if (!sessionId) {
      throw new Error("Local Elysia did not return a coding session id.");
    }
    return sessionId;
  }

  public async sendCodingChat(request: {
    session_id?: string;
    message: string;
    workspace_label?: string;
    approval_mode: string;
    approved_file_context?: {
      file_label: string;
      relative_path: string;
      language_hint?: string;
      path_hash: string;
      content_preview: string;
      source_contents_included: boolean;
      approval_granted: boolean;
    };
  }): Promise<CodingChatReply> {
    const envelope = await this.request<ChatData>("/coding/chat", {
      method: "POST",
      body: JSON.stringify(request)
    });
    const result = envelope.data?.coding_chat;
    if (!result?.assistant_text) {
      return { assistantText: "Local Elysia coding bridge returned no planning response." };
    }
    const plan = result.plan?.length ? `\n\nPlan:\n${result.plan.map((item) => `- ${item}`).join("\n")}` : "";
    const refused = result.refused_capabilities?.length ? `\n\nDisabled here: ${result.refused_capabilities.join(", ")}.` : "";
    return { assistantText: `${result.assistant_text}${plan}${refused}`, patchProposal: result.patch_proposal };
  }

  public async inspectRepoPreview(request: { workspace_root: string; session_id?: string; max_depth?: number; max_entries?: number }): Promise<RepoInspectPreview> {
    const envelope = await this.request<RepoPreviewData>("/coding/repo/inspect-preview", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.repo_preview) {
      throw new Error("Local Elysia did not return repo preview data.");
    }
    return envelope.data.repo_preview;
  }

  public async readSelectedFilePreview(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<FilePreviewData>("/coding/file/read-preview", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.file_preview) {
      throw new Error("Local Elysia did not return file preview data.");
    }
    return envelope.data.file_preview;
  }

  public async planFileOperation(request: {
    session_id?: string;
    approval_mode: string;
    workspace_root: string;
    operation_kind: "create" | "edit" | "replace" | "delete" | "rename" | "move";
    target_path: string;
    destination_path?: string;
    summary: string;
    new_text?: string;
  }): Promise<CodingFileOperationPlan> {
    const envelope = await this.request<FileOperationPlanData>("/coding/file/operation-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.file_operation_plan) throw new Error("Local Elysia did not return a file operation plan.");
    return envelope.data.file_operation_plan;
  }

  public async applyApprovedFileOperation(request: {
    session_id?: string;
    approval_mode: string;
    workspace_root: string;
    operation_kind: "create" | "edit" | "replace" | "delete" | "rename" | "move";
    target_path: string;
    destination_path?: string;
    summary: string;
    new_text?: string;
    expected_content_hash?: string;
    approval_id: string;
    approval_token: string;
    operator_approved: boolean;
    approval_phrase: string;
  }): Promise<CodingFileOperationResult> {
    const envelope = await this.request<FileOperationResultData>("/coding/file/operation-execute-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.file_operation_result) throw new Error("Local Elysia did not return a file operation result.");
    return this.withEnvelopeTruth(envelope.data.file_operation_result, envelope);
  }

  public async inspectDocument(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<DocumentPreviewData>("/coding/document/inspect", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document) {
      throw new Error("Local Elysia did not return document inspect data.");
    }
    return this.normalizeDocumentPreview(envelope.data.document);
  }

  public async extractDocumentPreview(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    max_chars?: number;
    max_tables?: number;
    max_rows?: number;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<DocumentPreviewData>("/coding/document/extract-preview", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document) {
      throw new Error("Local Elysia did not return document extraction data.");
    }
    return this.normalizeDocumentPreview(envelope.data.document);
  }

  public async planDocumentExport(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    export_format: "markdown" | "text";
    target_path?: string;
  }): Promise<CodingDocumentPlan> {
    const envelope = await this.request<DocumentExportPlanData>("/coding/document/export-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document_export_plan) {
      throw new Error("Local Elysia did not return document export plan data.");
    }
    return envelope.data.document_export_plan;
  }

  public async applyApprovedDocumentExport(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    operator_approved: boolean;
    export_format: "markdown" | "text";
    target_path?: string;
    expected_source_hash?: string;
    overwrite_existing?: boolean;
    expected_target_hash?: string;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingDocumentApplyResult> {
    const envelope = await this.request<DocumentExportResultData>("/coding/document/export-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document_export_result) {
      throw new Error("Local Elysia did not return document export result data.");
    }
    return this.withEnvelopeTruth(envelope.data.document_export_result, envelope);
  }

  public async planDocumentEdit(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    operation: string;
    parameters: Record<string, unknown>;
  }): Promise<CodingDocumentPlan> {
    const envelope = await this.request<DocumentEditPlanData>("/coding/document/edit-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document_edit_plan) {
      throw new Error("Local Elysia did not return document edit plan data.");
    }
    return envelope.data.document_edit_plan;
  }

  public async applyApprovedDocumentEdit(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    operator_approved: boolean;
    operation: string;
    parameters: Record<string, unknown>;
    expected_source_hash?: string;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingDocumentApplyResult> {
    const envelope = await this.request<DocumentEditResultData>("/coding/document/apply-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document_edit_result) {
      throw new Error("Local Elysia did not return document edit result data.");
    }
    return this.withEnvelopeTruth(envelope.data.document_edit_result, envelope);
  }

  public async inspectData(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<DataPreviewData>("/coding/data/inspect", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.data) {
      throw new Error("Local Elysia did not return data inspect data.");
    }
    return this.normalizeDataPreview(envelope.data.data);
  }

  public async previewData(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    max_rows?: number;
    max_features?: number;
    max_values?: number;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<DataPreviewData>("/coding/data/preview", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.data) {
      throw new Error("Local Elysia did not return data preview data.");
    }
    return this.normalizeDataPreview(envelope.data.data);
  }

  public async planDataExport(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    export_format: "markdown" | "json";
    target_path?: string;
  }): Promise<CodingDataPlan> {
    const envelope = await this.request<DataExportPlanData>("/coding/data/export-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.data_export_plan) {
      throw new Error("Local Elysia did not return data export plan data.");
    }
    return envelope.data.data_export_plan;
  }

  public async applyApprovedDataExport(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    operator_approved: boolean;
    export_format: "markdown" | "json";
    target_path?: string;
    expected_source_hash?: string;
    overwrite_existing?: boolean;
    expected_target_hash?: string;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingDataApplyResult> {
    const envelope = await this.request<DataExportResultData>("/coding/data/export-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.data_export_result) {
      throw new Error("Local Elysia did not return data export result data.");
    }
    return this.withEnvelopeTruth(envelope.data.data_export_result, envelope);
  }

  public async planDataMutation(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    operation: string;
    parameters: Record<string, unknown>;
  }): Promise<CodingDataPlan> {
    const envelope = await this.request<DataMutationPlanData>("/coding/data/mutation-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.data_mutation_plan) {
      throw new Error("Local Elysia did not return data mutation plan data.");
    }
    return envelope.data.data_mutation_plan;
  }

  public async applyApprovedDataMutation(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    operator_approved: boolean;
    operation: string;
    parameters: Record<string, unknown>;
    expected_source_hash?: string;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingDataApplyResult> {
    const envelope = await this.request<DataMutationResultData>("/coding/data/apply-mutation-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.data_mutation_result) {
      throw new Error("Local Elysia did not return data mutation result data.");
    }
    return this.withEnvelopeTruth(envelope.data.data_mutation_result, envelope);
  }

  public async inspectVisual(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<VisualPreviewData>("/coding/visual/inspect", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.visual) {
      throw new Error("Local Elysia did not return visual inspect data.");
    }
    return this.normalizeVisualPreview(envelope.data.visual);
  }

  public async previewVisual(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<VisualPreviewData>("/coding/visual/preview", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.visual) {
      throw new Error("Local Elysia did not return visual preview data.");
    }
    return this.normalizeVisualPreview(envelope.data.visual);
  }

  public async runVisualOcr(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    max_chars?: number;
  }): Promise<Record<string, unknown>> {
    const envelope = await this.request<VisualOcrData>("/coding/visual/ocr", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.ocr) {
      throw new Error("Local Elysia did not return visual OCR data.");
    }
    return envelope.data.ocr;
  }

  public async analyzeVisual(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    include_semantic_provider?: boolean;
  }): Promise<Record<string, unknown>> {
    const envelope = await this.request<VisualAnalysisData>("/coding/visual/analysis", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.analysis) {
      throw new Error("Local Elysia did not return visual analysis data.");
    }
    return envelope.data.analysis;
  }

  public async planVisualExport(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    export_format: "markdown" | "json" | "png" | "jpg" | "webp" | "tiff" | "svg";
    target_path?: string;
  }): Promise<CodingDocumentPlan> {
    const envelope = await this.request<VisualExportPlanData>("/coding/visual/export-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.visual_export_plan) {
      throw new Error("Local Elysia did not return visual export plan data.");
    }
    return envelope.data.visual_export_plan;
  }

  public async applyApprovedVisualExport(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    operator_approved: boolean;
    export_format: "markdown" | "json" | "png" | "jpg" | "webp" | "tiff" | "svg";
    target_path?: string;
    expected_source_hash?: string;
    overwrite_existing?: boolean;
    expected_target_hash?: string;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingDocumentApplyResult> {
    const envelope = await this.request<VisualExportResultData>("/coding/visual/export-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.visual_export_result) {
      throw new Error("Local Elysia did not return visual export result data.");
    }
    return this.withEnvelopeTruth(envelope.data.visual_export_result, envelope);
  }

  public async planVisualEdit(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
    operation: string;
    parameters: Record<string, unknown>;
  }): Promise<CodingDocumentPlan> {
    const envelope = await this.request<VisualEditPlanData>("/coding/visual/edit-plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.visual_edit_plan) {
      throw new Error("Local Elysia did not return visual edit plan data.");
    }
    return envelope.data.visual_edit_plan;
  }

  public async applyApprovedVisualEdit(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    operator_approved: boolean;
    operation: string;
    parameters: Record<string, unknown>;
    expected_source_hash?: string;
    expected_target_hash?: string;
    overwrite_existing?: boolean;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingDocumentApplyResult> {
    const envelope = await this.request<VisualEditResultData>("/coding/visual/apply-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.visual_apply_result) {
      throw new Error("Local Elysia did not return visual edit result data.");
    }
    return this.withEnvelopeTruth(envelope.data.visual_apply_result, envelope);
  }

  public async inspectMedia(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<MediaPreviewData>("/coding/media/inspect", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.media) {
      throw new Error("Local Elysia did not return media inspect data.");
    }
    return this.normalizeMediaPreview(this.withEnvelopeTruth(envelope.data.media, envelope));
  }

  public async thumbnailMedia(request: {
    workspace_root: string;
    file_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<FileReadPreview> {
    const envelope = await this.request<MediaPreviewData>("/coding/media/thumbnail", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.media) {
      throw new Error("Local Elysia did not return media thumbnail data.");
    }
    return this.normalizeMediaPreview(this.withEnvelopeTruth(envelope.data.media, envelope));
  }

  public async inspectArchive(request: {
    workspace_root: string;
    archive_path: string;
    session_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<ArchiveContainerPreview> {
    const envelope = await this.request<ArchivePreviewData>("/coding/archive/inspect", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.archive) throw new Error("Local Elysia did not return ArchiveForge inspection data.");
    return envelope.data.archive;
  }

  public async planArchiveExtraction(request: {
    workspace_root: string;
    archive_path: string;
    session_id?: string;
    selected_member_indexes: number[];
    sandbox_id?: string;
    approval_granted: boolean;
    approval_reason?: string;
  }): Promise<ArchiveExtractionPlan> {
    const envelope = await this.request<ArchivePlanData>("/coding/archive/extract/plan", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.archive_extraction_plan) throw new Error("Local Elysia did not return an ArchiveForge extraction plan.");
    return envelope.data.archive_extraction_plan;
  }

  public async applyApprovedArchiveExtraction(request: {
    operation_id: string;
    workspace_root: string;
    archive_path: string;
    session_id?: string;
    selected_member_indexes: number[];
    sandbox_id: string;
    approval_granted: boolean;
    approval_reason?: string;
    approval_id: string;
    approval_token: string;
    operator_approved: boolean;
    expected_archive_sha256: string;
    expected_manifest_digest: string;
    expected_plan_hash: string;
  }): Promise<ArchiveExtractionResult> {
    const envelope = await this.request<ArchiveResultData>("/coding/archive/extract/apply", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.archive_extraction_result) throw new Error("Local Elysia did not return an ArchiveForge extraction result.");
    return envelope.data.archive_extraction_result;
  }

  public async getMediaWorkerTruth(): Promise<MediaWorkerTruth> {
    const envelope = await this.request<MediaWorkerTruthData>("/coding/media/workers", { method: "GET" });
    if (!envelope.data?.media_workers) throw new Error("Local Elysia did not return media worker truth.");
    return envelope.data.media_workers;
  }

  public async getTtsVoices(): Promise<{ voices: TtsVoice[]; voiceCloningAvailable: false }> {
    const envelope = await this.request<TtsVoiceData>("/coding/media/tts/voices", { method: "GET" });
    return { voices: envelope.data?.voices ?? [], voiceCloningAvailable: false };
  }

  public async planSpeechTts(request: {
    session_id?: string; workspace_root: string; text: string; voice_id: string; speed?: number;
    target_path?: string; approval_granted: boolean; approval_reason?: string; purpose_category?: string;
  }): Promise<SpeechTtsPlan> {
    const envelope = await this.request<SpeechTtsPlanData>("/coding/media/tts/preview", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.tts_plan) throw new Error("Local Elysia did not return a TTS plan.");
    return envelope.data.tts_plan;
  }

  public async applyApprovedSpeechTts(request: Parameters<ElysiaApiClient["planSpeechTts"]>[0] & {
    expected_text_hash: string; expected_plan_hash: string; approval_id: string; approval_token: string;
  }): Promise<SpeechTtsResult> {
    const envelope = await this.request<SpeechTtsResultData>("/coding/media/tts/apply", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.tts_result) throw new Error("Local Elysia did not return a TTS result.");
    return this.withEnvelopeTruth(envelope.data.tts_result, envelope);
  }

  public async planSpeechTranscription(request: {
    session_id?: string; workspace_root: string; file_path: string; target_path?: string; output_format?: "txt" | "json" | "srt" | "vtt";
    approval_granted: boolean; approval_reason?: string; operator_has_processing_rights: boolean; contains_other_people: boolean;
    other_people_consent_confirmed: boolean; private_local_use: boolean; redact_sensitive_text: boolean;
  }): Promise<SpeechTranscriptionPlan> {
    const envelope = await this.request<SpeechTranscriptionPlanData>("/coding/media/transcribe/preview", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.transcription_plan) throw new Error("Local Elysia did not return a transcription plan.");
    return envelope.data.transcription_plan;
  }

  public async applyApprovedSpeechTranscription(request: Parameters<ElysiaApiClient["planSpeechTranscription"]>[0] & {
    expected_source_hash: string; expected_plan_hash: string; approval_id: string; approval_token: string;
  }): Promise<SpeechTranscriptionResult> {
    const envelope = await this.request<SpeechTranscriptionResultData>("/coding/media/transcribe/apply", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.transcription_result) throw new Error("Local Elysia did not return a transcription result.");
    return this.withEnvelopeTruth(envelope.data.transcription_result, envelope);
  }

  public async planVideoForge(request: {
    session_id?: string; workspace_root: string; prompt: string; negative_prompt?: string;
    purpose_category?: "private_creative" | "documentary_illustration" | "lab_smoke";
    target_path?: string; approval_granted: boolean; approval_reason?: string;
    lab_acknowledged: boolean; contains_real_person_request: false;
  }): Promise<VideoForgePlan> {
    const envelope = await this.request<VideoForgePlanData>("/coding/media/videoforge/preview", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.videoforge_plan) throw new Error("Local Elysia did not return a VideoForge plan.");
    return envelope.data.videoforge_plan;
  }

  public async applyApprovedVideoForge(request: Parameters<ElysiaApiClient["planVideoForge"]>[0] & {
    expected_prompt_hash: string; expected_plan_hash: string; approval_id: string; approval_token: string;
  }): Promise<VideoForgeJob> {
    const envelope = await this.request<VideoForgeJobData>("/coding/media/videoforge/apply", { method: "POST", body: JSON.stringify(request) });
    if (!envelope.data?.videoforge_job) throw new Error("Local Elysia did not return a VideoForge job.");
    return this.withEnvelopeTruth(envelope.data.videoforge_job, envelope);
  }

  public async getVideoForgeJob(operationId: string): Promise<VideoForgeJob> {
    const envelope = await this.request<VideoForgeJobData>(`/coding/media/videoforge/jobs/${encodeURIComponent(operationId)}`, { method: "GET" });
    if (!envelope.data?.videoforge_job) throw new Error("Local Elysia did not return VideoForge job truth.");
    return this.withEnvelopeTruth(envelope.data.videoforge_job, envelope);
  }

  public async cancelVideoForgeJob(operationId: string): Promise<VideoForgeJob> {
    const envelope = await this.request<VideoForgeJobData>(`/coding/media/videoforge/jobs/${encodeURIComponent(operationId)}/cancel`, {
      method: "POST", body: JSON.stringify({ reason: "codev_operator_cancelled" })
    });
    if (!envelope.data?.videoforge_job) throw new Error("Local Elysia did not return VideoForge cancellation truth.");
    return this.withEnvelopeTruth(envelope.data.videoforge_job, envelope);
  }

  public async applyApprovedPatch(request: {
    session_id?: string;
    approval_mode: string;
    workspace_root: string;
    target_file: string;
    proposed_diff: string;
    expected_content_hash: string;
    patch_hash: string;
    operator_approved: boolean;
    approval_phrase?: string;
    approval_id: string;
    approval_token: string;
  }): Promise<CodingPatchApplyResult> {
    const envelope = await this.request<PatchApplyData>("/coding/patch/apply-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.patch_apply) {
      throw new Error("Local Elysia did not return patch apply result data.");
    }
    return this.withEnvelopeTruth(envelope.data.patch_apply, envelope);
  }

  public async planCommand(request: {
    session_id?: string;
    approval_mode: string;
    workspace_root: string;
    command: string[];
    purpose: string;
  }): Promise<CodingCommandPlan> {
    const envelope = await this.request<CommandPlanData>("/coding/command/plan", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.command_plan) throw new Error("Local Elysia did not return a command plan.");
    return envelope.data.command_plan;
  }

  public async approveOperation(request: {
    session_id?: string;
    operation_kind: string;
    operation_summary: string;
    workspace_root: string;
    exact_files: string[];
    source_hash?: string;
    plan_hash: string;
    allowed_mutation_class: string;
    expires_in_seconds?: number;
    operator_approved: boolean;
    approval_phrase: string;
    rollback_note: string;
  }): Promise<CodingOperationApproval> {
    const envelope = await this.request<OperationApprovalData>("/coding/operation/approve", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.operation_approval) throw new Error("Local Elysia did not issue an operation approval.");
    const approval = this.withEnvelopeTruth(envelope.data.operation_approval, envelope);
    if (approval.status !== "approved" || !approval.approval_token) {
      throw new Error(`Operation approval was not issued (${approval.status}).`);
    }
    return approval;
  }

  public async listOperationAudits(limit = 20): Promise<CodingOperationAudit[]> {
    const envelope = await this.request<OperationAuditData>(`/coding/operation/audit?limit=${Math.max(1, Math.min(limit, 50))}`, { method: "GET" });
    return envelope.data?.operation_audits ?? [];
  }

  public async runApprovedCommand(request: {
    approval_id: string;
    approval_token?: string;
    approval_mode: string;
    command_id: string;
    workspace_root: string;
    operator_approved: boolean;
  }): Promise<CodingCommandRunResult> {
    const envelope = await this.request<CommandRunData>("/coding/command/run-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.command_run) {
      throw new Error("Local Elysia did not return command run data.");
    }
    return this.withEnvelopeTruth(envelope.data.command_run, envelope);
  }

  private withEnvelopeTruth<T extends object>(result: T, envelope: Envelope<unknown>): T {
    return envelope.request_id ? { ...result, request_id: envelope.request_id } : result;
  }

  private async request<T>(path: string, init: LocalRequestInit): Promise<Envelope<T>> {
    const target = this.buildLocalUrl(path);
    const response = await this.localHttpRequest(target, init);
    let envelope: Envelope<T>;
    try {
      envelope = JSON.parse(response.body) as Envelope<T>;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${init.method} ${target.toString()} returned non-JSON response (${response.status}): ${detail}`);
    }
    if (!response.ok || envelope.status === "error" || envelope.status === "blocked") {
      const validationDetail = Array.isArray(envelope.detail)
        ? envelope.detail.map((item) => typeof item === "object" && item !== null && "msg" in item ? String((item as { msg: unknown }).msg) : JSON.stringify(item)).join("; ")
        : typeof envelope.detail === "string" ? envelope.detail : "";
      const detail = envelope.errors?.join("; ") || validationDetail || `Local Elysia responded with ${response.status}.`;
      throw new Error(detail);
    }
    return envelope;
  }

  private normalizeDocumentPreview(document: FileReadPreview): FileReadPreview {
    return {
      ...document,
      file_type_id: document.descriptor?.type_id ?? document.file_type_id,
      file_type_label: document.descriptor?.label ?? document.file_type_label,
      category: "document",
      adapter: "document",
      content_preview: document.text_preview ?? document.content_preview,
      parse_summary: {
        ...(document.parse_summary ?? {}),
        document_type_id: document.descriptor?.type_id,
        document_label: document.descriptor?.label,
        document_family: document.descriptor?.family,
        adapter: document.descriptor?.adapter,
        status: document.status,
        metadata: document.metadata ?? {},
        safety: document.safety ?? {},
        outline_count: document.outline?.length ?? 0,
        table_count: document.tables?.length ?? 0,
        provenance_count: document.provenance?.length ?? 0,
        warnings: document.warnings ?? [],
        redactions: document.redactions ?? []
      },
      source_contents_included: Boolean(document.text_preview ?? document.content_preview),
      bytes_returned: document.bytes_returned ?? 0,
      lines_returned: document.lines_returned ?? 0,
      truncated: document.truncated ?? false,
      warnings: document.warnings ?? [],
      secret_scan_findings: document.secret_scan_findings ?? [],
      redactions: document.redactions ?? []
    };
  }

  private normalizeDataPreview(data: FileReadPreview): FileReadPreview {
    return {
      ...data,
      file_type_id: data.descriptor?.type_id ?? data.file_type_id,
      file_type_label: data.descriptor?.label ?? data.file_type_label,
      category: "science_data",
      adapter: "data",
      content_preview: data.content_preview ?? JSON.stringify(data.preview ?? data.schema_summary ?? data.metadata ?? {}, null, 2),
      parse_summary: {
        ...(data.parse_summary ?? {}),
        ...data,
        descriptor: data.descriptor ?? {},
        metadata: data.metadata ?? {},
        schema_summary: data.schema_summary ?? {},
        preview: data.preview ?? {},
        warnings: data.warnings ?? []
      },
      source_contents_included: false,
      bytes_returned: data.bytes_returned ?? 0,
      lines_returned: data.lines_returned ?? 0,
      truncated: data.truncated ?? data.preview_truncated ?? false,
      warnings: data.warnings ?? [],
      secret_scan_findings: data.secret_scan_findings ?? [],
      redactions: data.redactions ?? []
    };
  }

  private normalizeVisualPreview(visual: FileReadPreview): FileReadPreview {
    return {
      ...visual,
      file_type_id: visual.descriptor?.type_id ?? visual.file_type_id,
      file_type_label: visual.descriptor?.label ?? visual.file_type_label,
      category: "visual",
      adapter: visual.descriptor?.adapter ?? visual.adapter ?? "visual",
      content_preview:
        visual.content_preview ??
        `Visual ${visual.descriptor?.label ?? visual.file_label}: metadata, privacy report, safe thumbnail, and local analysis are available through governed visual stewardship.`,
      parse_summary: {
        ...(visual.parse_summary ?? {}),
        descriptor: visual.descriptor ?? {},
        metadata: visual.metadata ?? {},
        preview: visual.preview ?? {},
        exif_privacy: (visual as { exif_privacy?: Record<string, unknown> }).exif_privacy ?? {},
        svg_safety: (visual as { svg_safety?: Record<string, unknown> }).svg_safety ?? {},
        risk_flags: visual.risk_flags ?? {},
        warnings: visual.warnings ?? []
      },
      source_contents_included: false,
      bytes_returned: visual.bytes_returned ?? 0,
      lines_returned: visual.lines_returned ?? 0,
      truncated: visual.truncated ?? false,
      warnings: visual.warnings ?? [],
      secret_scan_findings: visual.secret_scan_findings ?? [],
      redactions: visual.redactions ?? []
    };
  }

  private normalizeMediaPreview(media: FileReadPreview): FileReadPreview {
    return {
      ...media,
      file_type_id: media.descriptor?.type_id ?? media.file_type_id,
      file_type_label: media.descriptor?.label ?? media.file_type_label,
      category: "media",
      adapter: "media",
      content_preview:
        media.content_preview ??
        `Media ${media.descriptor?.label ?? media.file_label}: bounded local metadata; raw media and embedded tag values are excluded. Governed STT and non-cloning TTS use separate exact-approved worker routes.`,
      parse_summary: {
        ...(media.parse_summary ?? {}),
        descriptor: media.descriptor ?? {},
        media_family: media.media_family,
        container: media.container,
        duration_seconds: media.duration_seconds,
        bitrate_bps: media.bitrate_bps,
        stream_count: media.stream_count,
        audio: media.audio ?? {},
        video: media.video ?? {},
        privacy_flags: media.privacy_flags ?? {},
        safety_flags: media.safety_flags ?? {},
        thumbnail_status: media.thumbnail_status,
        request_id: media.request_id,
        operation_id: media.operation_id,
        audit_written: media.audit_written === true
      },
      preview: {
        ...(media.preview ?? {}),
        thumbnail_data_url: media.thumbnail_data_url,
        thumbnail_status: media.thumbnail_status
      },
      source_contents_included: false,
      bytes_returned: 0,
      lines_returned: 0,
      truncated: false,
      warnings: media.warnings ?? [],
      secret_scan_findings: [],
      redactions: []
    };
  }

  private buildLocalUrl(path: string): URL {
    return buildLoopbackUrl(this.apiUrl, path);
  }

  private async localHttpRequest(target: URL, init: LocalRequestInit): Promise<LocalResponse> {
    const client = target.protocol === "https:" ? https : http;
    const body = init.body ?? "";
    const method = init.method;

    return new Promise((resolve, reject) => {
      const request = client.request(
        target,
        {
          method,
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
          },
          timeout: 5000
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          response.on("end", () => {
            const status = response.statusCode ?? 0;
            resolve({
              ok: status >= 200 && status < 300,
              status,
              body: Buffer.concat(chunks).toString("utf-8")
            });
          });
        }
      );

      request.on("timeout", () => {
        request.destroy(new Error(`${method} ${target.toString()} timed out after 5000ms.`));
      });

      request.on("error", (error: NodeJS.ErrnoException) => {
        const code = error.code ? ` ${error.code}` : "";
        reject(new Error(`${method} ${target.toString()} failed${code}: ${error.message}`));
      });

      if (body) {
        request.write(body);
      }
      request.end();
    });
  }
}
