import * as http from "node:http";
import * as https from "node:https";
import * as vscode from "vscode";
import type {
  CodingBridgeStatus,
  CodingChatReply,
  CodingCommandRunResult,
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
