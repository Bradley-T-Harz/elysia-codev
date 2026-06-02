import * as React from "react";
import type { WebviewState } from "../types";

type Props = { connection: WebviewState["connection"]; workspace: WebviewState["workspace"] };
export default function SettingsPanel({ connection, workspace }: Props) {
  return <section className="panel"><div className="panel-head"><span>Settings</span><span className="pill">local</span></div><dl className="facts"><div><dt>API URL</dt><dd>{connection.apiUrl}</dd></div><div><dt>Can preview</dt><dd>{workspace.canReadWorkspace ? "metadata only" : "no"}</dd></div><div><dt>Can patch</dt><dd>no</dd></div><div><dt>Can run commands</dt><dd>no</dd></div></dl></section>;
}
