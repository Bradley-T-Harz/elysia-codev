import * as React from "react";
import type { WebviewState } from "../types";

type Props = { git: WebviewState["git"] };
export default function GitStatusPanel({ git }: Props) {
  return (
    <section className="panel">
      <div className="panel-head"><span>Git Status</span><span className={git.status === "completed" ? "pill" : "pill pill--warn"}>{git.status.replaceAll("_", " ")}</span></div>
      <dl className="facts">
        <div><dt>Branch</dt><dd>{git.branch}</dd></div><div><dt>Working tree</dt><dd>{git.dirtyState}</dd></div>
        <div><dt>Changed</dt><dd>{git.changedCount}</dd></div><div><dt>Staged</dt><dd>{git.stagedCount}</dd></div>
        <div><dt>Unstaged</dt><dd>{git.unstagedCount}</dd></div><div><dt>Untracked</dt><dd>{git.untrackedCount}</dd></div>
        <div><dt>HEAD</dt><dd>{git.headCommit?.slice(0, 12) ?? "unknown"}</dd></div><div><dt>Remote</dt><dd>{git.remotePresent === undefined ? "unknown" : git.remotePresent ? "present" : "absent"}</dd></div>
      </dl>
      <p className="muted">{git.summary} Commit, push, reset, clean, stash, checkout, and other Git mutations are unavailable.</p>
    </section>
  );
}
