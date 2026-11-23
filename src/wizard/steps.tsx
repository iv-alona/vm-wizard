import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, IconButton, Tag, TextField } from "../components/controls";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import {
  checkDiskForm, checkName, checkResources, formatDisk, formatRam, HOST, nextDiskName, OS_FAMILIES, OS_VERSIONS, ramInGB,
  type Disk, type DiskForm, type Draft, type OsFamily, type Provisioning, type RamUnit, type SizeUnit,
} from "./model";

type SetDraft = (fn: (d: Draft) => Draft) => void;

export function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="step-title">
      <h1 tabIndex={-1} data-step-heading>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

// ---------- Step 1

export function StepGeneral({ draft, set, showErrors }: { draft: Draft; set: SetDraft; showErrors: boolean }) {
  const [debounced, setDebounced] = useState(draft.name);
  useEffect(() => { const t = setTimeout(() => setDebounced(draft.name), 350); return () => clearTimeout(t); }, [draft.name]);
  const live = checkName(debounced);
  const now = checkName(draft.name);
  const settled = debounced === draft.name;
  // Taken names are checked live (like a server lookup); format errors appear after Next.
  const error = settled && live.suggestion ? live.error : showErrors ? now.error : undefined;
  const success = settled && draft.name && now.ok ? "Name is available" : undefined;
  return (
    <>
      <StepTitle title="Name your VM" subtitle="Choose a unique name and the operating system." />
      <div className="fields">
        <TextField
          label="VM name"
          hint="3–63 characters: letters, digits and hyphens. Must be unique."
          placeholder="e.g. web-server-01"
          value={draft.name}
          onChange={(e) => set((d) => ({ ...d, name: e.target.value }))}
          error={error}
          success={success}
          autoComplete="off"
          spellCheck={false}
          data-invalid={!!(showErrors && now.error) || undefined}
          after={settled && live.suggestion && (
            <div className="suggestion">
              <span>This name is free:</span>
              <Button size="sm" variant="neutral" onClick={() => set((d) => ({ ...d, name: live.suggestion! }))}>Use {live.suggestion}</Button>
            </div>
          )}
        />
        <Select<OsFamily>
          label="OS family"
          value={draft.osFamily}
          options={OS_FAMILIES}
          onChange={(v) => set((d) => ({ ...d, osFamily: v, version: OS_VERSIONS[v][0] }))}
        />
        <Select<string>
          label="Version"
          hint={`Default image for ${draft.osFamily}`}
          value={draft.version}
          options={OS_VERSIONS[draft.osFamily]}
          onChange={(v) => set((d) => ({ ...d, version: v }))}
        />
      </div>
    </>
  );
}

// ---------- Step 2

export function StepResources({ draft, set, showErrors, hostRamGB, editing }: { draft: Draft; set: SetDraft; showErrors: boolean; hostRamGB: number; editing: boolean }) {
  const r = checkResources(draft, hostRamGB);
  return (
    <>
      <StepTitle title="Allocate CPU and RAM" subtitle={editing ? "You're editing from Review. “Back to review” keeps your changes." : "Limits come from the selected host."} />
      <div className="fields">
        <TextField
          label="CPU cores"
          hint={`Available on host: ${HOST.cpu} cores`}
          inputMode="numeric"
          value={draft.cpu}
          onChange={(e) => set((d) => ({ ...d, cpu: e.target.value.replace(/[^\d]/g, "") }))}
          error={showErrors ? r.cpu : undefined}
          data-invalid={!!(showErrors && r.cpu) || undefined}
        />
        <div className="row">
          <TextField
            className="grow"
            label="RAM"
            hint={`Available on host: ${hostRamGB} GB`}
            inputMode="decimal"
            value={draft.ram}
            onChange={(e) => set((d) => ({ ...d, ram: e.target.value.replace(/[^\d.]/g, "") }))}
            error={showErrors ? r.ram : undefined}
            data-invalid={!!(showErrors && r.ram) || undefined}
            after={showErrors && r.unitSuggestion && (
              <div className="suggestion">
                <span>Did you mean {r.unitSuggestion}?</span>
                <Button size="sm" variant="neutral" onClick={() => set((d) => ({ ...d, ramUnit: "GB" }))}>Switch to GB</Button>
              </div>
            )}
          />
          <Select<RamUnit> label="Unit" hint="GB or MB" value={draft.ramUnit} options={["GB", "MB"]} width={120}
            onChange={(v) => set((d) => ({ ...d, ramUnit: v }))} error={showErrors && !!r.ram} />
        </div>
        <Checkbox label="Enable nested virtualization" description="Lets this VM run its own virtual machines"
          checked={draft.nested} onChange={(v) => set((d) => ({ ...d, nested: v }))} />
      </div>
    </>
  );
}

// ---------- Step 3

export function StepDisks({ draft, set }: { draft: Draft; set: SetDraft }) {
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [lastDiskMsg, setLastDiskMsg] = useState(false);
  const [attachNote, setAttachNote] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const remove = (id: string) => {
    if (draft.disks.length === 1) { setLastDiskMsg(true); return; }
    setLastDiskMsg(false);
    set((d) => ({ ...d, disks: d.disks.filter((x) => x.id !== id) }));
  };
  return (
    <>
      <StepTitle title="Add disks" subtitle="Every VM needs at least one disk. We added a default one: edit it or add more." />
      <ul className="disk-list" aria-label="Disks">
        {draft.disks.map((k) => (
          <li key={k.id} className="disk-row">
            <span className="disk-tile"><Icon name="hard-drive" size={20} /></span>
            <span className="disk-text">
              <span className="disk-name">{k.name}</span>
              <span className="disk-meta">{formatDisk(k)}</span>
            </span>
            {k.isDefault && <Tag>Default</Tag>}
            <IconButton icon="edit" label={`Edit ${k.name}`} onClick={() => setModal({ id: k.id })} />
            <IconButton icon="trash" label={`Remove ${k.name}`} onClick={() => remove(k.id)} />
          </li>
        ))}
      </ul>
      {lastDiskMsg && <p className="field-error" role="alert">A VM needs at least one disk. Edit this disk instead.</p>}
      <div className="row-actions">
        <Button ref={addRef} icon="plus" variant="neutral" onClick={() => setModal({})}>Create new disk</Button>
        <Button variant="subtle" onClick={() => setAttachNote(true)}>Attach existing disk</Button>
      </div>
      {attachNote && <p className="field-hint" role="status">Attaching an existing disk isn’t part of this prototype — create a new one instead.</p>}
      {modal && (
        <DiskModal
          disks={draft.disks}
          editing={modal.id ? draft.disks.find((d) => d.id === modal.id) : undefined}
          onClose={() => setModal(null)}
          onSave={(disk) => {
            set((d) => ({ ...d, disks: modal.id ? d.disks.map((x) => (x.id === modal.id ? { ...x, ...disk } : x)) : [...d.disks, disk] }));
            setModal(null);
          }}
        />
      )}
    </>
  );
}

function DiskModal({ disks, editing, onClose, onSave }: { disks: Disk[]; editing?: Disk; onClose: () => void; onSave: (d: Disk) => void }) {
  const [form, setForm] = useState<DiskForm>(() => editing
    ? { name: editing.name, size: String(editing.size), unit: editing.unit, provisioning: editing.provisioning }
    : { name: nextDiskName(disks), size: "50", unit: "GB", provisioning: "Thin" });
  const [submitted, setSubmitted] = useState(false);
  const errors = checkDiskForm(form, disks, editing?.id);
  const submit = () => {
    setSubmitted(true);
    if (errors.name || errors.size) { document.querySelector<HTMLInputElement>(".modal [aria-invalid='true']")?.focus(); return; }
    onSave({ id: editing?.id ?? `disk-${Date.now()}`, name: form.name.trim(), size: Number(form.size), unit: form.unit, provisioning: form.provisioning, isDefault: editing?.isDefault });
  };
  return (
    <Modal
      title={editing ? `Edit ${editing.name}` : "Create new disk"}
      onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{editing ? "Save disk" : "Add disk"}</Button></>}
    >
      <form className="fields" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextField label="Disk name" value={form.name} data-autofocus onChange={(e) => setForm({ ...form, name: e.target.value })} error={submitted ? errors.name : undefined} />
        <div className="row">
          <TextField className="grow" label="Size" inputMode="numeric" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value.replace(/[^\d.]/g, "") })} error={submitted ? errors.size : undefined} />
          <Select<SizeUnit> label="Unit" value={form.unit} options={["GB", "TB"]} width={120} onChange={(v) => setForm({ ...form, unit: v })} />
        </div>
        <Select<Provisioning>
          label="Provisioning"
          hint={form.provisioning === "Thin" ? "Thin: space is used as data is written" : "Thick: the full size is reserved at once"}
          value={form.provisioning}
          options={["Thin", "Thick"]}
          onChange={(v) => setForm({ ...form, provisioning: v })}
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

// ---------- Step 4

export function StepReview({ draft, hostRamGB, failed, onEdit }: { draft: Draft; hostRamGB: number; failed: boolean; onEdit: (step: 1 | 2 | 3) => void }) {
  const ramTooBig = ramInGB(draft) > hostRamGB;
  const Row = ({ k, v, danger }: { k: string; v: string; danger?: boolean }) => (
    <div className="review-row"><dt>{k}</dt><dd className={danger ? "is-danger" : ""}>{v}</dd></div>
  );
  return (
    <>
      <StepTitle title="Review and create" subtitle="Check the settings. Edit any group before you create the VM." />
      {failed && ramTooBig && (
        <div className="banner banner-danger" role="alert">
          <Icon name="alert-triangle" size={20} />
          <div>
            <p className="banner-title">VM was not created</p>
            <p className="banner-body">Not enough free RAM on the host: {hostRamGB} GB available. Edit CPU & RAM and try again. All other settings are kept.</p>
          </div>
        </div>
      )}
      <section className="review-group">
        <header><h2>General</h2><Button size="sm" variant="subtle" onClick={() => onEdit(1)} aria-label="Edit General">Edit</Button></header>
        <dl><Row k="Name" v={draft.name} /><Row k="Operating system" v={`${draft.version} (${draft.osFamily})`} /></dl>
      </section>
      <section className={`review-group ${failed && ramTooBig ? "is-danger" : ""}`}>
        <header><h2>CPU & RAM</h2><Button size="sm" variant="subtle" onClick={() => onEdit(2)} aria-label="Edit CPU and RAM">Edit</Button></header>
        <dl>
          <Row k="CPU cores" v={draft.cpu} />
          <Row k="RAM" v={failed && ramTooBig ? `${formatRam(draft)} · exceeds free RAM (${hostRamGB} GB)` : formatRam(draft)} danger={failed && ramTooBig} />
          <Row k="Nested virtualization" v={draft.nested ? "On" : "Off"} />
        </dl>
      </section>
      <section className="review-group">
        <header><h2>Disks</h2><Button size="sm" variant="subtle" onClick={() => onEdit(3)} aria-label="Edit Disks">Edit</Button></header>
        <dl>{draft.disks.map((k) => <Row key={k.id} k={k.name} v={formatDisk(k)} />)}</dl>
      </section>
    </>
  );
}
