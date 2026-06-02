import * as React from "react";

type Props = { files: Array<{ path: string; state: string }> };
export default function ChangedFilesPanel({ files }: Props) {
  return <section className="panel"><div className="panel-head"><span>Changed Files</span><span className="pill">safe</span></div>{files.length === 0 ? <p className="muted">No files listed. Git scanning is not live in this scaffold.</p> : <ul className="file-list">{files.map((file) => <li key={file.path}><span>{file.path}</span><small>{file.state}</small></li>)}</ul>}</section>;
}
