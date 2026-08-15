import * as React from "react";
import type { WebviewState } from "../types";

type Props = { connection: WebviewState["connection"]; workspace: WebviewState["workspace"]; developerProfile: WebviewState["coding"]["developerProfile"]; lastRequestId?: string };
export default function SettingsPanel({ connection, workspace, developerProfile, lastRequestId }: Props) {
  return (
    <section className="panel">
      <div className="panel-head"><span>Settings Truth</span><span className="pill">local</span></div>
      <dl className="facts">
        <div><dt>API</dt><dd>{connection.state}</dd></div><div><dt>Authentication</dt><dd>{connection.authStatus ?? "unknown"}</dd></div>
        <div><dt>Developer profile</dt><dd>{developerProfile?.profile_readiness ?? "unknown"}</dd></div><div><dt>Codev install</dt><dd>{developerProfile?.codev_install.state ?? "unknown"}</dd></div>
        <div><dt>Workspace</dt><dd>{workspace.workspaceLabel}</dd></div><div><dt>Root identity</dt><dd>{workspace.workspaceRootHash ?? "not approved"}</dd></div>
        <div><dt>VS Code trust</dt><dd>{workspace.vscodeTrusted ? "trusted" : "untrusted"}</dd></div><div><dt>Elysia approval</dt><dd>{workspace.repoApprovalStatus}</dd></div>
        <div><dt>Trust mode</dt><dd>{workspace.trustMode.replaceAll("_", " ")}</dd></div><div><dt>Approval posture</dt><dd>{workspace.canApplyPatch ? "exact apply allowed" : workspace.canReadWorkspace ? "read/plan only" : "restricted"}</dd></div>
        <div><dt>API version</dt><dd>{connection.apiVersion ?? developerProfile?.api_version ?? "unknown"}</dd></div><div><dt>Contract</dt><dd>{connection.contractVersion ?? developerProfile?.coding_contract_version ?? "unknown"}</dd></div>
        <div><dt>Last request</dt><dd>{lastRequestId ?? connection.lastRequestId ?? "none"}</dd></div><div><dt>Push/publish</dt><dd>unavailable</dd></div>
      </dl>
      <p className="muted">Workspace paths and credentials stay inside the extension host. This surface shows only a repository label/hash and credential status.</p>
    </section>
  );
}
