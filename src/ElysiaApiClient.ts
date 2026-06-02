import * as vscode from "vscode";
import type { ElysiaConnectionStatus } from "./types";

export class ElysiaApiClient {
  public get apiUrl(): string {
    return vscode.workspace.getConfiguration("elysia").get<string>("apiUrl", "http://127.0.0.1:8000");
  }

  public async getStatus(): Promise<ElysiaConnectionStatus> {
    const apiUrl = this.apiUrl.replace(/\/$/, "");
    try {
      const response = await fetch(`${apiUrl}/status/runtime`, { method: "GET" });
      if (!response.ok) {
        return { state: "unavailable", apiUrl, summary: `Local Elysia responded with ${response.status}.`, checkedAt: new Date().toISOString() };
      }
      const data = await response.json() as { status?: string; data?: unknown };
      return { state: "connected", apiUrl, summary: data.status ? `Local Elysia API reachable: ${data.status}.` : "Local Elysia API reachable.", checkedAt: new Date().toISOString() };
    } catch (error) {
      return { state: "unavailable", apiUrl, summary: error instanceof Error ? error.message : "Local Elysia API unavailable.", checkedAt: new Date().toISOString() };
    }
  }

  public async sendPlaceholderMessage(text: string): Promise<string> {
    const status = await this.getStatus();
    if (status.state !== "connected") {
      return `Local Elysia API unavailable. Your message stayed inside the VS Code companion shell: ${text}`;
    }
    return `Local Elysia is reachable. Chat/coding endpoints are not wired in this extension scaffold yet, so no repo mutation or command execution occurred.`;
  }
}
