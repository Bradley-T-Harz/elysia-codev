import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  preview: WebviewState["patchPreview"];
  applyResult: WebviewState["coding"]["patchApplyResult"];
  commandResult: WebviewState["coding"]["commandResult"];
  onReview: () => void;
  onCopyDiff: () => void;
  onDiscard: () => void;
};

export default function ReviewWorkflowPanel({ preview, applyResult, commandResult, onReview, onCopyDiff, onDiscard }: Props) {
  const hasDiff = Boolean(preview.diffPreview);

  return (
    <section className="panel">
      <div className="panel-head">
        <span>Review Workflow</span>
        <span className={hasDiff ? "pill" : "pill pill--warn"}>{hasDiff ? "proposal ready" : "waiting"}</span>
      </div>
      <dl className="facts facts--single">
        <div><dt>Edited/proposed files</dt><dd>{preview.files.length ? preview.files.join(", ") : "none"}</dd></div>
        <div><dt>Patch state</dt><dd>{preview.state}</dd></div>
        <div><dt>Operation result</dt><dd>{applyResult?.status ?? "none"}</dd></div>
        <div><dt>Last check</dt><dd>{commandResult ? `${commandResult.command_id}: ${commandResult.status}` : "none"}</dd></div>
      </dl>
      <div className="button-row">
        <button className="ghost" type="button" disabled={!hasDiff} onClick={onReview}>Open native diff</button>
        <button className="ghost" type="button" disabled={!hasDiff} onClick={onCopyDiff}>Copy diff</button>
        <button className="ghost" type="button" disabled={!hasDiff} onClick={onDiscard}>Reject / Discard</button>
      </div>
      <p className="muted">Native diff opens the exact approved source against a virtual proposed document. Apply remains separate and binds Elysia approval to exact file/content/patch hashes. Reject only clears this local proposal view.</p>
    </section>
  );
}
