import * as React from "react";
import type { WebviewState } from "../types";

type Props = {
  goal: WebviewState["goalWorkflow"];
  onPlanMode: () => void;
  onPursueGoal: () => void;
  onStop: () => void;
  onFullOperator: () => void;
};

export default function GoalWorkflowPanel({ goal, onPlanMode, onPursueGoal, onStop, onFullOperator }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span>Plan / Pursue Goal</span>
        <span className="pill pill--warn">no autonomy</span>
      </div>
      <dl className="facts facts--single">
        <div><dt>Task status</dt><dd>{goal.status.replaceAll("_", " ")}</dd></div>
        <div><dt>Current goal</dt><dd>{goal.currentGoal ?? "none"}</dd></div>
      </dl>
      <div className="button-row">
        <button className="ghost" type="button" onClick={onPlanMode}>Plan Mode</button>
        <button className="ghost" type="button" disabled={!goal.pursueGoalEnabled} onClick={onPursueGoal}>Pursue Goal</button>
        <button className="ghost" type="button" onClick={onStop}>Stop</button>
        <button className="ghost" type="button" onClick={onFullOperator}>Full Operator Mode</button>
      </div>
      <p className="muted">Pursue Goal, autonomy, and bounded task loops are not enabled yet. Full Operator Mode requires a future Elysia core contract, stronger approval, and audit gates.</p>
      {goal.notes.length ? <p className="muted">{goal.notes.join(" ")}</p> : null}
    </section>
  );
}
