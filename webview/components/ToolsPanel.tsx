import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  bridge: WebviewState["coding"]["bridge"];
};

export default function ToolsPanel({ bridge }: Props) {
  const boundaries = bridge?.boundaries;
  const localTools = [
    { label: "Coding bridge status", live: true },
    { label: "Approved file preview", live: Boolean(boundaries?.selected_file_read_allowed) },
    { label: "Patch proposal", live: Boolean(boundaries?.patch_proposal_allowed) },
    { label: "Approved patch apply", live: Boolean(boundaries?.patch_apply_allowed) },
    { label: "Approved checks", live: Boolean(boundaries?.command_execution_allowed) }
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <span>Tools / Plugins</span>
        <span className="pill">governed</span>
      </div>
      <ul className="tool-list">
        {localTools.map((tool) => (
          <li key={tool.label}>
            <span>{tool.label}</span>
            <small className={tool.live ? "tool-live" : "tool-disabled"}>{tool.live ? "local Elysia" : "disabled"}</small>
          </li>
        ))}
        <li><span>Installed Codev tools</span><small className="tool-live">UI shell</small></li>
        <li><span>Developer Forge tools</span><small className="tool-disabled">placeholder</small></li>
        <li><span>Marketplace/add-on tools</span><small className="tool-disabled">placeholder</small></li>
      </ul>
      <p className="muted">Codev does not grant tools directly. Elysia core owns capability, policy, approval, and audit truth.</p>
    </section>
  );
}
