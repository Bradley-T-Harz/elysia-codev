import * as React from "react";
import { useState } from "react";
import type { WebviewState } from "../types";

type Props = { goal: WebviewState["goalWorkflow"]; onPlanMode: () => void; onPlanGoal: (objective: string, maxSteps: number, maxMinutes: number) => void; onApproveGoal: () => void; onPursueGoal: () => void; onStop: () => void; onFullOperator: () => void };
export default function GoalWorkflowPanel({ goal, onPlanMode, onPlanGoal, onApproveGoal, onPursueGoal, onStop, onFullOperator }: Props) {
  const [objective, setObjective] = useState("");
  const [maxSteps, setMaxSteps] = useState(4);
  const [maxMinutes, setMaxMinutes] = useState(15);
  return (
    <section className="panel">
      <div className="panel-head"><span>Developer Lab Goal</span><span className="pill pill--warn">checkpoint only</span></div>
      <p className="muted">A bounded plan never runs itself. Each checkpoint needs a separate click and produces a receipt; patches and checks keep their own exact approvals.</p>
      <label className="field-label">Objective<textarea value={objective} maxLength={2000} rows={3} onChange={(event) => setObjective(event.target.value)} placeholder="Describe one bounded local repository goal" /></label>
      <div className="facts"><label>Steps<input type="number" min={1} max={8} value={maxSteps} onChange={(event) => setMaxSteps(Number(event.target.value))} /></label><label>Minutes<input type="number" min={1} max={30} value={maxMinutes} onChange={(event) => setMaxMinutes(Number(event.target.value))} /></label></div>
      <dl className="facts facts--single"><div><dt>Status</dt><dd>{goal.status.replaceAll("_", " ")}</dd></div><div><dt>Progress</dt><dd>{goal.currentStep ?? 0}/{goal.maxSteps ?? maxSteps}</dd></div><div><dt>Last checkpoint</dt><dd>{goal.nextStepLabel ?? "none"}</dd></div><div><dt>Receipt</dt><dd>{goal.receiptId ?? "none"}</dd></div></dl>
      <div className="button-row">
        <button className="ghost" type="button" onClick={onPlanMode}>Plan posture</button>
        <button className="ghost" type="button" disabled={!objective.trim()} onClick={() => onPlanGoal(objective, maxSteps, maxMinutes)}>Create bounded plan</button>
        <button className="ghost" type="button" disabled={goal.status !== "approval_required"} onClick={onApproveGoal}>Approve plan</button>
        <button className="ghost" type="button" disabled={!goal.pursueGoalEnabled} onClick={onPursueGoal}>Run next checkpoint</button>
        <button className="ghost" type="button" disabled={!goal.taskId} onClick={onStop}>Stop / revoke</button>
        <button className="ghost" type="button" disabled onClick={onFullOperator}>Full Operator unavailable</button>
      </div>
      {goal.notes.length ? <ul className="muted">{goal.notes.map((note, index) => <li key={`${index}:${note}`}>{note}</li>)}</ul> : null}
    </section>
  );
}
