import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./controls";

/** Modal dialog: focus moves in, Tab is trapped, Esc and the close button cancel, focus returns on close. */
export function Modal({ title, onClose, children, footer, size = "md", role = "dialog" }: {
  title: string; onClose: () => void; children: ReactNode; footer: ReactNode; size?: "md" | "sm"; role?: "dialog" | "alertdialog";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current!;
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>("button, input, [tabindex]:not([tabindex='-1'])")).filter((el) => !el.hasAttribute("disabled"));
    (node.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener("keydown", onKey);
    return () => { node.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);
  const titleId = `modal-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`modal modal-${size}`} role={role} aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h2 id={titleId} className="modal-title">{title}</h2>
          {role === "dialog" && <IconButton icon="x" label="Close" onClick={onClose} />}
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}
