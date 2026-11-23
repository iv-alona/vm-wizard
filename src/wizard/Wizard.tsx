import { useCallback, useEffect, useRef, useState } from "react";
import { Banner, Button, IconButton, Tag } from "../components/controls";
import { Icon } from "../components/Icon";
import { CreationProgress, OrbitLoader } from "../components/Loader";
import { Modal } from "../components/Modal";
import { Stepper } from "../components/Stepper";
import { formatRam, initialDraft, pluralDisks, ramInGB, stepIsValid, type Draft, type StepIndex } from "./model";
import { StepDisks, StepGeneral, StepResources, StepReview } from "./steps";

type Phase = "form" | "creating" | "success" | "failure";
export type Theme = "light" | "dark";

const STAGES = ["Allocating CPU & RAM", "Creating disks", "Configuring the VM"];

export function Wizard({ theme, onToggleTheme, failNext, onFailConsumed }: {
  theme: Theme; onToggleTheme: () => void; failNext: boolean; onFailConsumed: () => void;
}) {
  const [draft, setDraftState] = useState<Draft>(initialDraft);
  const [step, setStep] = useState<StepIndex>(1);
  const [frontier, setFrontier] = useState(1);
  const [editing, setEditing] = useState(false);
  const [showErrors, setShowErrors] = useState<Record<number, boolean>>({});
  const [blocked, setBlocked] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [stage, setStage] = useState(1);
  const [hostRamGB, setHostRamGB] = useState(128);
  const [failed, setFailed] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const set = useCallback((fn: (d: Draft) => Draft) => { setDraftState(fn); setDirty(true); setBlocked(false); }, []);

  // move focus to the heading of each new step for screen readers & keyboard users
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    contentRef.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, [step, phase]);

  const focusFirstInvalid = () => requestAnimationFrame(() => contentRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']")?.focus());

  const reset = () => {
    setDraftState(initialDraft()); setStep(1); setFrontier(1); setEditing(false); setShowErrors({});
    setBlocked(false); setPhase("form"); setStage(1); setFailed(false); setDirty(false); setDiscardOpen(false); setHostRamGB(128);
  };

  /** Forward moves validate every step in between (same rule as Next). */
  const go = (target: StepIndex) => {
    if (target <= step) { setStep(target); setEditing(false); setBlocked(false); return; }
    for (let k = step; k < target; k++) {
      if (!stepIsValid(k as StepIndex, draft, hostRamGB)) {
        setShowErrors((s) => ({ ...s, [k]: true }));
        if (k !== step) setStep(k as StepIndex);
        setBlocked(true);
        focusFirstInvalid();
        return;
      }
    }
    setBlocked(false); setEditing(false); setStep(target); setFrontier((f) => Math.max(f, target));
  };

  const backToReview = () => {
    if (!stepIsValid(step, draft, hostRamGB)) { setShowErrors((s) => ({ ...s, [step]: true })); setBlocked(true); focusFirstInvalid(); return; }
    setEditing(false); setBlocked(false); setStep(4);
  };

  const create = () => {
    setPhase("creating"); setStage(1);
    // Fails if the host can't fit the RAM — either after a previous failure (host now 64 GB)
    // or when the demo switch simulates another VM grabbing resources.
    const willFail = ramInGB(draft) > hostRamGB || (failNext && ramInGB(draft) > 64);
    const t1 = setTimeout(() => setStage(2), 800);
    const t2 = setTimeout(() => setStage(3), 1600);
    const t3 = setTimeout(() => {
      if (willFail) { setHostRamGB(64); setFailed(true); setPhase("failure"); onFailConsumed(); }
      else { setStage(4); setPhase("success"); }
    }, 2600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  };

  const requestClose = () => (dirty && phase === "form" ? setDiscardOpen(true) : reset());

  const header = (
    <header className="wiz-header">
      <p className="wiz-title">New virtual machine</p>
      <div className="wiz-header-actions">
        <IconButton icon={theme === "light" ? "moon" : "sun"} label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} onClick={onToggleTheme} />
        <IconButton icon="x" label="Close wizard" onClick={requestClose} />
      </div>
    </header>
  );

  if (phase !== "form") {
    return (
      <div className="window" data-phase={phase}>
        {header}
        <div className="status" ref={contentRef} aria-live="polite">
          {phase === "creating" && (
            <>
              <OrbitLoader />
              <h1 tabIndex={-1} data-step-heading>Creating {draft.name}…</h1>
              <p className="status-text">This usually takes less than a minute. Keep this window open to see the result.</p>
              <CreationProgress stage={stage} labels={STAGES} />
            </>
          )}
          {phase === "success" && (
            <>
              <span className="halo halo-positive"><Icon name="check-circle" size={44} /></span>
              <h1 tabIndex={-1} data-step-heading>VM created</h1>
              <p className="status-text"><strong>{draft.name}</strong> is ready</p>
              <div className="chips"><Tag tone="brand">{draft.cpu} CPU cores</Tag><Tag tone="brand">{formatRam(draft)} RAM</Tag><Tag tone="brand">{pluralDisks(draft.disks.length)}</Tag></div>
              <p className="status-text">It is powered off, so you can start it from the VM page.</p>
            </>
          )}
          {phase === "failure" && (
            <>
              <span className="halo halo-danger"><Icon name="x-circle" size={44} /></span>
              <h1 tabIndex={-1} data-step-heading>VM was not created</h1>
              <p className="status-text">Not enough free RAM on the host: {hostRamGB} GB available, {formatRam(draft)} requested. Another VM took resources while you were in the wizard. All your settings are kept.</p>
            </>
          )}
        </div>
        {phase !== "creating" && (
          <footer className="wiz-footer">
            <span className="spacer" />
            {phase === "success" && <><Button variant="neutral" onClick={reset}>Close</Button><Button variant="primary" onClick={reset}>Go to VM</Button></>}
            {phase === "failure" && <><Button variant="neutral" onClick={() => { setPhase("form"); setStep(4); }}>Back to review</Button><Button variant="primary" onClick={create}>Retry</Button></>}
          </footer>
        )}
      </div>
    );
  }

  return (
    <div className="window">
      {header}
      <div className="wiz-body">
        <Stepper current={step} frontier={frontier} edit={editing} onGo={go} />
        <main className="wiz-content" ref={contentRef}>
          {step === 1 && <StepGeneral draft={draft} set={set} showErrors={!!showErrors[1]} />}
          {step === 2 && <StepResources draft={draft} set={set} showErrors={!!showErrors[2]} hostRamGB={hostRamGB} editing={editing} />}
          {step === 3 && <StepDisks draft={draft} set={set} />}
          {step === 4 && <StepReview draft={draft} hostRamGB={hostRamGB} failed={failed} onEdit={(k) => { setEditing(true); setStep(k); setShowErrors((s) => ({ ...s, [k]: true })); }} />}
          {blocked && <div className="blocked"><Banner title="Fix the errors on this step to continue">The highlighted fields need your attention.</Banner></div>}
        </main>
      </div>
      <footer className="wiz-footer">
        <Button variant="subtle" onClick={requestClose}>Cancel</Button>
        <span className="spacer" />
        {editing ? (
          <Button variant="primary" onClick={backToReview}>Back to review</Button>
        ) : (
          <>
            {step > 1 && <Button variant="neutral" onClick={() => go((step - 1) as StepIndex)}>Back</Button>}
            {step < 4 && <Button variant="subtle" onClick={() => go(4)}>Review and create</Button>}
            {step < 4 ? <Button variant="primary" onClick={() => go((step + 1) as StepIndex)}>Next</Button> : <Button variant="primary" onClick={create}>Create VM</Button>}
          </>
        )}
      </footer>
      {discardOpen && (
        <Modal title="Discard VM?" size="sm" role="alertdialog" onClose={() => setDiscardOpen(false)}
          footer={<><Button variant="neutral" data-autofocus onClick={() => setDiscardOpen(false)}>Keep editing</Button><Button variant="danger" onClick={reset}>Discard VM</Button></>}>
          <p className="modal-text">The settings you entered will be lost. Nothing has been created yet.</p>
        </Modal>
      )}
    </div>
  );
}
