import * as vscode from "vscode";
import type { ApprovalMode, ElysiaMessage, ElysiaSession, IdeContextSettings } from "./types";

const SESSION_KEY = "elysia.sessions.v0";
const MESSAGE_KEY = "elysia.messages.v0";
const CONTEXT_KEY = "elysia.context-preferences.v1";
const ACTIVE_SESSION_KEY = "elysia.active-session.v1";
const LAST_RECEIPT_KEY = "elysia.last-receipt.v1";

const DEFAULT_CONTEXT: IdeContextSettings = {
  workspaceMetadata: true,
  activeFileMetadata: true,
  approvedFilePreview: true,
  diagnosticsSummary: false,
  selectedChangedFiles: []
};

function safeRelativePath(value: string): boolean {
  return Boolean(value) && !value.startsWith("/") && !value.startsWith("\\") && !/^[A-Za-z]:[\\/]/.test(value) && !value.split(/[\\/]/).includes("..");
}

export class SessionStore {
  public constructor(private readonly context: vscode.ExtensionContext) {}

  public getSessions(): ElysiaSession[] {
    return this.context.workspaceState.get<ElysiaSession[]>(SESSION_KEY, []);
  }

  public getMessages(sessionId: string | null): ElysiaMessage[] {
    if (!sessionId) return [];
    const all = this.context.workspaceState.get<Record<string, ElysiaMessage[]>>(MESSAGE_KEY, {});
    return all[sessionId] ?? [];
  }

  public getContextPreferences(): IdeContextSettings {
    const stored = this.context.workspaceState.get<Partial<IdeContextSettings>>(CONTEXT_KEY, {});
    return {
      workspaceMetadata: stored.workspaceMetadata !== false,
      activeFileMetadata: stored.activeFileMetadata !== false,
      approvedFilePreview: stored.approvedFilePreview !== false,
      diagnosticsSummary: stored.diagnosticsSummary === true,
      selectedChangedFiles: Array.isArray(stored.selectedChangedFiles)
        ? stored.selectedChangedFiles.filter((item): item is string => typeof item === "string" && safeRelativePath(item)).slice(0, 20)
        : []
    };
  }

  public async setContextPreferences(settings: IdeContextSettings): Promise<void> {
    await this.context.workspaceState.update(CONTEXT_KEY, {
      ...settings,
      selectedChangedFiles: settings.selectedChangedFiles.filter(safeRelativePath).slice(0, 20)
    });
  }

  public getActiveSessionId(): string | null {
    return this.context.workspaceState.get<string | null>(ACTIVE_SESSION_KEY, null);
  }

  public async setActiveSessionId(sessionId: string | null): Promise<void> {
    await this.context.workspaceState.update(ACTIVE_SESSION_KEY, sessionId);
  }

  public getLastReceipt(): { requestId?: string; operationId?: string } {
    return this.context.workspaceState.get<{ requestId?: string; operationId?: string }>(LAST_RECEIPT_KEY, {});
  }

  public async setLastReceipt(receipt: { requestId?: string; operationId?: string }): Promise<void> {
    await this.context.workspaceState.update(LAST_RECEIPT_KEY, receipt);
  }

  public async newSession(workspaceLabel: string, approvalMode: ApprovalMode, backendSessionId?: string): Promise<ElysiaSession> {
    const now = new Date().toISOString();
    const sessionNumber = this.getSessions().length + 1;
    const session: ElysiaSession = {
      id: `elysia_${Date.now().toString(36)}`,
      backendSessionId,
      title: `Coding room ${sessionNumber}`,
      workspaceLabel,
      createdAt: now,
      updatedAt: now,
      status: "active",
      approvalMode
    };
    await this.context.workspaceState.update(SESSION_KEY, [session, ...this.getSessions()].slice(0, 40));
    return session;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const sessions = this.getSessions().filter((session) => session.id !== sessionId);
    const allMessages = this.context.workspaceState.get<Record<string, ElysiaMessage[]>>(MESSAGE_KEY, {});
    delete allMessages[sessionId];
    await this.context.workspaceState.update(SESSION_KEY, sessions);
    await this.context.workspaceState.update(MESSAGE_KEY, allMessages);
  }

  public async appendMessage(sessionId: string, message: ElysiaMessage): Promise<void> {
    const all = this.context.workspaceState.get<Record<string, ElysiaMessage[]>>(MESSAGE_KEY, {});
    all[sessionId] = [...(all[sessionId] ?? []), message].slice(-120);
    await this.context.workspaceState.update(MESSAGE_KEY, all);
  }

  public async updateSessionApprovalMode(sessionId: string, approvalMode: ApprovalMode): Promise<void> {
    const now = new Date().toISOString();
    const sessions = this.getSessions().map((session) => (
      session.id === sessionId ? { ...session, approvalMode, updatedAt: now } : session
    ));
    await this.context.workspaceState.update(SESSION_KEY, sessions);
  }

  public async clear(): Promise<void> {
    await this.context.workspaceState.update(SESSION_KEY, []);
    await this.context.workspaceState.update(MESSAGE_KEY, {});
    await this.context.workspaceState.update(CONTEXT_KEY, DEFAULT_CONTEXT);
    await this.context.workspaceState.update(ACTIVE_SESSION_KEY, null);
    await this.context.workspaceState.update(LAST_RECEIPT_KEY, {});
  }
}
