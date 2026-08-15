import * as React from "react";
import type { WebviewState } from "../types";

type Props = { bridge: WebviewState["coding"]["bridge"]; catalog: WebviewState["coding"]["commandCatalog"] };
export default function ToolsPanel({ bridge, catalog }: Props) {
  const boundaries = bridge?.boundaries;
  const tools = [
    { label: "Repository / Git truth", state: bridge?.available ? "read-only" : "unavailable" },
    { label: "Approved file preview", state: boundaries?.selected_file_read_allowed ? "requires approval" : "unavailable" },
    { label: "Patch proposal", state: boundaries?.patch_proposal_allowed ? "live" : "unavailable" },
    { label: "Exact patch apply", state: boundaries?.patch_apply_allowed ? "requires approval" : "unavailable" },
    { label: "Bounded command catalog", state: catalog?.entries.some((entry) => entry.execution_enabled) ? "requires approval" : "worker-gated" },
    { label: "Developer Lab checkpoints", state: "plan/checkpoint only" },
    { label: "Arbitrary shell / push / publish", state: "hard blocked" }
  ];
  return (
    <section className="panel">
      <div className="panel-head"><span>Governed Tools</span><span className="pill">exact ports</span></div>
      <ul className="tool-list">{tools.map((tool) => <li key={tool.label}><span>{tool.label}</span><small className={/live|read-only|requires/.test(tool.state) ? "tool-live" : "tool-disabled"}>{tool.state}</small></li>)}</ul>
      <p className="muted">Codev exposes only Elysia-declared contracts. There is no arbitrary command box, hidden shell, package install, Git mutation, network, push, or publish path.</p>
    </section>
  );
}
