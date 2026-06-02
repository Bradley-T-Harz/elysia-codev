import * as React from "react";
import type { ApprovalMode } from "../types";

const modes: ApprovalMode[] = ["read_only", "plan_only", "patch_preview", "apply_with_approval", "test_with_approval"];

type Props = { mode: ApprovalMode; onChange: (mode: ApprovalMode) => void };
export default function ApprovalBar({ mode, onChange }: Props) {
  return <section className="panel"><div className="panel-head"><span>Approval</span><span className="pill">governed</span></div><select value={mode} onChange={(event) => onChange(event.target.value as ApprovalMode)}>{modes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><p className="muted">Patch apply and command execution remain disabled in v0.1.0 even if future modes are visible.</p></section>;
}
