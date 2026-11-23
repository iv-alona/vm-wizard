import { Icon } from "./Icon";
import { STEPS, type StepIndex } from "../wizard/model";

export type StepStatus = "current" | "done-open" | "done" | "in-progress" | "upcoming";

/** Position (open step) and progress (furthest step reached) are two separate signals. */
export function stepStatus(k: number, current: number, frontier: number, edit: boolean): StepStatus {
  if (edit) return k === current ? "done-open" : "done";
  if (k === current) return k < frontier ? "done-open" : "current";
  if (k < frontier) return "done";
  if (k === frontier) return "in-progress";
  return "upcoming";
}

export function Stepper({ current, frontier, edit, onGo, disabled }: {
  current: StepIndex; frontier: number; edit: boolean; onGo: (k: StepIndex) => void; disabled?: boolean;
}) {
  return (
    <nav className="stepper" aria-label="Wizard steps">
      <ol>
        {STEPS.map((label, i) => {
          const k = (i + 1) as StepIndex;
          const st = stepStatus(k, current, frontier, edit);
          const done = st === "done" || st === "done-open";
          return (
            <li key={label}>
              <button
                type="button"
                className={`step step-${st}`}
                aria-current={k === current ? "step" : undefined}
                onClick={() => onGo(k)}
                disabled={disabled}
              >
                <span className="step-marker" aria-hidden="true">{done ? <Icon name="check-circle" size={24} /> : k}</span>
                <span className="step-label">{label}</span>
                <span className="sr-only">{done ? " (completed)" : st === "in-progress" ? " (in progress)" : ""}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
