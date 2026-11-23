# VM Wizard — interactive prototype

A working, high-fidelity prototype of a **“New virtual machine” wizard**, built from the Figma design of my UX case study. It goes beyond the Figma prototype: real validation, live data on every screen, any number of disks, keyboard and screen-reader support, and a light / dark theme from the same design tokens.

**Live demo:** https://iv-alona.github.io/vm-wizard/

## What to try

| Scenario | How |
| --- | --- |
| Happy path | Type any free name → Next → CPU & RAM → Disks → Review → Create VM |
| Name taken + suggestion | Type `VMHome1` → use the suggested free name |
| Validation on click (Next is never disabled) | Press Next with an empty name |
| Wrong unit | On CPU & RAM type `100` and pick **MB** → “Did you mean 100 GB?” |
| Review & edit loop | On Review press **Edit** → change → **Back to review** |
| Creation fails, recover | Tick “Next ‘Create VM’ fails” under the wizard → Create VM → Back to review → Edit RAM ≤ 64 GB → Create |
| Leave without losing work by accident | Cancel or ✕ after typing → “Discard VM?” |
| Stepper as navigation | Click any step; forward jumps validate first; visited steps keep their check |
| Theme | Moon / sun icon in the wizard header (remembered per browser) |

## Design decisions in code

- **Tokens first.** `src/styles/tokens.css` is exported from the Figma variable collection *HiFi tokens* (Light / Dark modes). Components only use tokens.
- **One state object** (`src/wizard/model.ts`) holds name, OS, CPU / RAM, disks and host limits, so every screen — including Review and the success summary — shows the same data.
- **Validate on click, never disable Next.** Errors appear under the field, focus moves to the first invalid field, and a banner explains why the step didn’t change.
- **Position vs progress in the stepper.** The open step is highlighted; every visited step keeps its check; the furthest step turns into an inactive circle when you go back.
- **Accessibility.** Native buttons and inputs, labelled fields with `aria-describedby` hints and errors, ARIA listbox dropdowns (↑ ↓ Home End Enter Esc), focus-trapped dialogs, `aria-current="step"`, `role="progressbar"`, and `prefers-reduced-motion` support.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Structure

```
src/
  styles/tokens.css     HiFi tokens (Light / Dark) exported from Figma
  styles/app.css        layout and component styles
  components/           Button, TextField, Select, Checkbox, Modal, Stepper, Loader, Icon
  wizard/model.ts       data model, host limits, validation rules
  wizard/steps.tsx      General, CPU & RAM, Disks (+ disk modal), Review
  wizard/Wizard.tsx     navigation, creation flow, success / failure, discard dialog
```

Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

---
UX case study by Alona Ivashko.
