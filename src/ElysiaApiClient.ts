import * as vscode from "vscode";
import type {
  CodingBridgeStatus,
  ElysiaConnectionStatus,
  RepoInspectPreview
} from "./types";

type Envelope<T> = {
  status?: string;
  data?: T;
  errors?: string[];
};

type CodingStatusData = { coding_bridge?: CodingBridgeStatus };
type SessionData = { session?: { session_id: string } };
type ChatData = { coding_chat?: { assistant_text: string; plan?: string[]; refused_capabilities?: string[] } };
type RepoPreviewData = { repo_preview?: RepoInspectPreview };

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

  public async sendCodingChat(request: { session_id?: string; message: string; workspace_label?: string; approval_mode: string }): Promise<string> {
    const envelope = await this.request<ChatData>("/coding/chat", {
      method: "POST",
      body: JSON.stringify(request)
    });
    const result = envelope.data?.coding_chat;
    if (!result?.assistant_text) {
      return "Local Elysia coding bridge returned no planning response.";
    }
    const plan = result.plan?.length ? `\n\nPlan:\n${result.plan.map((item) => `- ${item}`).join("\n")}` : "";
    const refused = result.refused_capabilities?.length ? `\n\nDisabled here: ${result.refused_capabilities.join(", ")}.` : "";
    return `${result.assistant_text}${plan}${refused}`;
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

  private async request<T>(path: string, init: RequestInit): Promise<Envelope<T>> {
    const apiUrl = this.apiUrl.replace(/\/$/, "");
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
    const envelope = await response.json() as Envelope<T>;
    if (!response.ok || envelope.status === "error" || envelope.status === "blocked") {
      const detail = envelope.errors?.join("; ") || `Local Elysia responded with ${response.status}.`;
      throw new Error(detail);
    }
    return envelope;
  }
}
