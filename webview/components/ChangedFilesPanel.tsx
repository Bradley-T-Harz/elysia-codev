import * as React from "react";

type ChangedFile = { path: string; state: string; staged: boolean; unstaged: boolean; selected: boolean };
type Props = { files: ChangedFile[]; onToggle: (path: string) => void };

export default function ChangedFilesPanel({ files, onToggle }: Props) {
  return (
    <section className="panel">
      <div className="panel-head"><span>Changed Files</span><span className="pill">SCM truth</span></div>
      <p className="muted">Real read-only Git state. Selecting a file sends only its relative path and SCM status with chat; source still requires a separate preview approval.</p>
      {files.length === 0 ? <p className="muted">No changed files, or repository approval/Git truth is unavailable.</p> : (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.path}>
              <label className="toggle-row">
                <input type="checkbox" checked={file.selected} onChange={() => onToggle(file.path)} />
                <span><strong>{file.path}</strong><small>{file.state} · {file.staged ? "staged" : "not staged"}{file.unstaged ? " · worktree" : ""}</small></span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
