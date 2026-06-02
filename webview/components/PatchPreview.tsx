import * as React from "react";

type Props = { preview: { state: string; summary: string; files: string[]; canApply: false } };
export default function PatchPreview({ preview }: Props) {
  return <section className="panel"><div className="panel-head"><span>Patch Preview</span><span className="pill pill--warn">disabled</span></div><p>{preview.summary}</p><p className="muted">Future patches must use preview, exact approval, local ledger truth, and rollback notes.</p></section>;
}
