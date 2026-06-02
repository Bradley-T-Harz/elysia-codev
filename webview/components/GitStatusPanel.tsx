import * as React from "react";

type Props = { git: { branch: string; dirtyState: string; changedCount: number; summary: string } };
export default function GitStatusPanel({ git }: Props) {
  return <section className="panel"><div className="panel-head"><span>Git Status</span><span className="pill">placeholder</span></div><dl className="facts"><div><dt>Branch</dt><dd>{git.branch}</dd></div><div><dt>Dirty</dt><dd>{git.dirtyState}</dd></div><div><dt>Changed</dt><dd>{git.changedCount}</dd></div></dl><p className="muted">{git.summary}</p></section>;
}
