import * as http from "node:http";
import * as https from "node:https";
import * as vscode from "vscode";
import type {
  CodingBridgeStatus,
  CodingChatReply,
  CodingCommandRunResult,
  CodingDocumentApplyResult,
  CodingDocumentPlan,
  CodingPatchApplyResult,
  CodingPatchProposal,
  ElysiaConnectionStatus,
  FileReadPreview,
  RepoInspectPreview
} from "./types";

type Envelope<T> = {
  status?: string;
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
type PatchApplyData = { patch_apply?: CodingPatchApplyResult };
type CommandRunData = { command_run?: CodingCommandRunResult };
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
  }): Promise<CodingDocumentApplyResult> {
    const envelope = await this.request<DocumentExportResultData>("/coding/document/export-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document_export_result) {
      throw new Error("Local Elysia did not return document export result data.");
    }
    return envelope.data.document_export_result;
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
  }): Promise<CodingDocumentApplyResult> {
    const envelope = await this.request<DocumentEditResultData>("/coding/document/apply-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.document_edit_result) {
      throw new Error("Local Elysia did not return document edit result data.");
    }
    return envelope.data.document_edit_result;
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
  }): Promise<CodingPatchApplyResult> {
    const envelope = await this.request<PatchApplyData>("/coding/patch/apply-approved", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!envelope.data?.patch_apply) {
      throw new Error("Local Elysia did not return patch apply result data.");
    }
    return envelope.data.patch_apply;
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
    return envelope.data.command_run;
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

  private buildLocalUrl(path: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(this.apiUrl.replace(/\/$/, ""));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid Elysia API URL "${this.apiUrl}": ${detail}`);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Rejected Elysia API URL scheme "${parsed.protocol}". Only http/https loopback URLs are allowed.`);
    }

    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }

    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "::1" && parsed.hostname !== "[::1]") {
      throw new Error(`Rejected non-loopback Elysia API host "${parsed.hostname}". Use http://127.0.0.1:<port>.`);
    }

    return new URL(path, parsed.toString().replace(/\/$/, "/"));
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
