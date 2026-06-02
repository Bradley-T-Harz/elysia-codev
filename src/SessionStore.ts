import * as vscode from "vscode";
import type { ApprovalMode, ElysiaMessage, ElysiaSession } from "./types";

const SESSION_KEY = "elysia.sessions.v0";
const MESSAGE_KEY = "elysia.messages.v0";

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

  public async newSession(workspaceLabel: string, approvalMode: ApprovalMode, backendSessionId?: string): Promise<ElysiaSession> {
    const now = new Date().toISOString();
    const session: ElysiaSession = {
      id: `elysia_${Date.now().toString(36)}`,
      backendSessionId,
      title: "New coding room",
      workspaceLabel,
      createdAt: now,
      updatedAt: now,
      status: "active",
      approvalMode
    };
    await this.context.workspaceState.update(SESSION_KEY, [session, ...this.getSessions()].slice(0, 40));
    return session;
  }

  public async appendMessage(sessionId: string, message: ElysiaMessage): Promise<void> {
    const all = this.context.workspaceState.get<Record<string, ElysiaMessage[]>>(MESSAGE_KEY, {});
    all[sessionId] = [...(all[sessionId] ?? []), message].slice(-120);
    await this.context.workspaceState.update(MESSAGE_KEY, all);
  }

  public async clear(): Promise<void> {
    await this.context.workspaceState.update(SESSION_KEY, []);
    await this.context.workspaceState.update(MESSAGE_KEY, {});
  }
}
