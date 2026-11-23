// Wizard data model, rules and validation.
// Mirrors the dev-handoff annotations in the Figma file.

export type OsFamily = "Linux" | "Windows" | "BSD";
export type RamUnit = "GB" | "MB";
export type SizeUnit = "GB" | "TB";
export type Provisioning = "Thin" | "Thick";

export interface Disk {
  id: string;
  name: string;
  size: number;
  unit: SizeUnit;
  provisioning: Provisioning;
  isDefault?: boolean;
}

export interface Draft {
  name: string;
  osFamily: OsFamily;
  version: string;
  cpu: string; // kept as text while typing
  ram: string;
  ramUnit: RamUnit;
  nested: boolean;
  disks: Disk[];
}

export const STEPS = ["General", "CPU & RAM", "Disks", "Review and create"] as const;
export type StepIndex = 1 | 2 | 3 | 4;

export const OS_FAMILIES: OsFamily[] = ["Linux", "Windows", "BSD"];
export const OS_VERSIONS: Record<OsFamily, string[]> = {
  Linux: ["Ubuntu 24.04 LTS", "Debian 12", "RHEL 9", "Rocky 9"],
  Windows: ["Windows Server 2025", "Windows Server 2022", "Windows 11 Pro"],
  BSD: ["FreeBSD 14", "OpenBSD 7.5"],
};

/**
 * Minimum RAM per OS image, from the vendors' documentation (checked Nov 2026):
 * Ubuntu Server docs (1.5 GB ISO install, 3 GB suggested), Debian 12 install guide (no desktop: 256 MB min, 512 MB recommended),
 * RHEL 9 install docs (1.5 GiB local media), Microsoft "Hardware requirements for Windows Server" (2 GB Desktop Experience,
 * 512 MB Server Core), Windows 11 requirements (4 GB). No note where no current official figure was found.
 */
export const OS_REQUIREMENTS: Record<string, { minRamGB: number; note: string }> = {
  "Ubuntu 24.04 LTS": { minRamGB: 1.5, note: "Ubuntu 24.04 LTS needs at least 1.5 GB RAM; 3 GB or more is suggested." },
  "Debian 12": { minRamGB: 0.25, note: "Debian 12 without a desktop needs at least 256 MB RAM; 512 MB is recommended." },
  "RHEL 9": { minRamGB: 1.5, note: "RHEL 9 needs at least 1.5 GB RAM." },
  "Windows Server 2025": { minRamGB: 2, note: "Windows Server 2025 needs at least 2 GB RAM with Desktop Experience (512 MB for Server Core)." },
  "Windows Server 2022": { minRamGB: 2, note: "Windows Server 2022 needs at least 2 GB RAM with Desktop Experience (512 MB for Server Core)." },
  "Windows 11 Pro": { minRamGB: 4, note: "Windows 11 needs at least 4 GB RAM." },
};

/** Names that already exist on the host (drives the “name taken” path). */
export const EXISTING_NAMES = ["VMHome1", "web-server-01", "db-primary"];

export const HOST = { cpu: 16, ramGB: 128, datastoreGB: 2048 };
export const MIN_RAM_MB = 512;

let diskSeq = 1;
export const newDiskId = () => `disk-${diskSeq++}`;

export const initialDraft = (): Draft => ({
  name: "",
  osFamily: "Linux",
  version: OS_VERSIONS.Linux[0],
  cpu: "2",
  ram: "8",
  ramUnit: "GB",
  nested: false,
  disks: [{ id: newDiskId(), name: "Disk1", size: 50, unit: "GB", provisioning: "Thin", isDefault: true }],
});

// ---------- helpers

export const ramInGB = (d: Pick<Draft, "ram" | "ramUnit">) => {
  const n = Number(d.ram);
  return d.ramUnit === "GB" ? n : n / 1024;
};

export const formatRam = (d: Pick<Draft, "ram" | "ramUnit">) => `${Number(d.ram)} ${d.ramUnit}`;
export const formatDisk = (k: Disk) => `${k.size} ${k.unit} · ${k.provisioning}`;
export const diskGB = (k: Pick<Disk, "size" | "unit">) => k.size * (k.unit === "TB" ? 1024 : 1);
export const formatGB = (gb: number) => `${Number(gb.toFixed(1))} GB`;
export const pluralDisks = (n: number) => (n === 1 ? "1 disk" : `${n} disks`);

export function nextFreeName(base: string, taken = EXISTING_NAMES) {
  const stem = base.replace(/-\d+$/, "");
  for (let i = 2; i < 100; i++) {
    const candidate = `${stem}-${i}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${stem}-${Date.now() % 1000}`;
}

export function nextDiskName(disks: Disk[]) {
  for (let i = 1; i < 100; i++) if (!disks.some((d) => d.name.toLowerCase() === `disk${i}`)) return `Disk${i}`;
  return `Disk${disks.length + 1}`;
}

// ---------- validation

export interface NameCheck {
  error?: string;
  suggestion?: string;
  ok?: boolean;
}

export function checkName(name: string): NameCheck {
  const v = name.trim();
  if (!v) return { error: "Enter a VM name" };
  if (!/^[A-Za-z0-9-]{3,63}$/.test(v)) return { error: "Use 3–63 characters: letters, digits and hyphens" };
  if (EXISTING_NAMES.some((n) => n.toLowerCase() === v.toLowerCase()))
    return { error: `${v} is already taken`, suggestion: nextFreeName(v) };
  return { ok: true };
}

export interface ResourceCheck {
  cpu?: string;
  ram?: string;
  /** e.g. “100” typed with MB selected → suggest GB */
  unitSuggestion?: string;
}

export function checkResources(d: Draft, hostRamGB: number): ResourceCheck {
  const out: ResourceCheck = {};
  const cpu = Number(d.cpu);
  if (!d.cpu.trim() || !Number.isInteger(cpu)) out.cpu = "Enter a whole number of cores";
  else if (cpu < 1) out.cpu = "Minimum 1 core";
  else if (cpu > HOST.cpu) out.cpu = `Maximum ${HOST.cpu} cores on this host`;

  const ram = Number(d.ram);
  if (!d.ram.trim() || Number.isNaN(ram) || ram <= 0) out.ram = "Enter the amount of RAM";
  else {
    const gb = ramInGB(d);
    if (gb * 1024 < MIN_RAM_MB) {
      out.ram = `Minimum ${MIN_RAM_MB} MB`;
      if (d.ramUnit === "MB" && ram >= 1 && ram <= hostRamGB) out.unitSuggestion = `${ram} GB`;
    } else if (gb > hostRamGB) out.ram = `Maximum ${hostRamGB} GB available on this host`;
  }
  return out;
}

export interface DiskForm {
  name: string;
  size: string;
  unit: SizeUnit;
  provisioning: Provisioning;
}

export function checkDiskForm(f: DiskForm, disks: Disk[], editingId?: string, freeGB = Infinity) {
  const out: { name?: string; size?: string } = {};
  const name = f.name.trim();
  if (!name) out.name = "Enter a disk name";
  else if (disks.some((d) => d.id !== editingId && d.name.toLowerCase() === name.toLowerCase()))
    out.name = "Disk name must be unique in this VM";
  const size = Number(f.size);
  if (!f.size.trim() || Number.isNaN(size) || size <= 0) out.size = "Enter a size greater than 0";
  else if (f.unit === "TB" && size > 64) out.size = "Maximum 64 TB";
  else if (diskGB({ size, unit: f.unit }) > freeGB) out.size = `Only ${formatGB(freeGB)} free on the datastore`;
  return out;
}

export function stepIsValid(step: StepIndex, d: Draft, hostRamGB: number) {
  if (step === 1) return !!checkName(d.name).ok;
  if (step === 2) { const r = checkResources(d, hostRamGB); return !r.cpu && !r.ram; }
  if (step === 3) return d.disks.length > 0;
  return true;
}
