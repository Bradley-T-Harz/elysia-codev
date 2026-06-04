import * as React from "react";
import type { ApprovalMode, WebviewState } from "../types";

const modes: ApprovalMode[] = ["read_only", "plan_only", "path_preview", "apply_with_approval", "test_with_approval"];

type Props = {
  mode: ApprovalMode;
  capabilities: WebviewState["approvalModeCapabilities"];
  onChange: (mode: ApprovalMode) => void;
};

export default function ApprovalBar({ mode, capabilities, onChange }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Approval</span>
        <span className="pill">governed</span>
      </div>
      <select value={mode} onChange={(event) => onChange(event.target.value as ApprovalMode)}>
        {modes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
      </select>
      <p className="muted">{capabilities.description}</p>
      <p className="muted">
        Patch: {capabilities.canProposePatch ? "proposal allowed" : "no proposal"} ·
        Apply: {capabilities.canApplyPatch ? "approval required" : "blocked"} ·
        Checks: {capabilities.canRunChecks ? "approval required" : "blocked"}
      </p>
    </section>
  );
}
