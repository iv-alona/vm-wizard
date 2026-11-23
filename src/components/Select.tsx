import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  hint?: string;
  width?: number;
  error?: boolean;
  /** Visible rows before the list scrolls (3.5 shows a half row as a scroll cue). */
  maxVisible?: number;
}

/**
 * Single-select dropdown (ARIA listbox pattern).
 * Click or Enter/Space/↓ opens; ↑↓ Home End move; Enter selects; Esc/Tab/outside click closes.
 * Only one menu is open at a time because any outside interaction closes it.
 */
export function Select<T extends string>({ label, value, options, onChange, hint, width, error, maxVisible = 3.5 }: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.indexOf(value)));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // The menu is portalled to <body> with position: fixed, so no footer, scroll area, transform or
  // backdrop-filter (e.g. the modal scrim) can clip or offset it.
  // It opens downward, or upward when there isn't enough room below.
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxH: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current!.getBoundingClientRect();
      const wanted = Math.min(options.length, maxVisible) * 40 + 10;
      const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
      const up = below < wanted && above > below;
      setPos({ left: r.left, width: r.width, maxH: Math.min(wanted, up ? above : below),
        ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, options.length, maxVisible]);

  const openMenu = () => { setActive(Math.max(0, options.indexOf(value))); setOpen(true); };
  const choose = (i: number) => { onChange(options[i]); setOpen(false); trigger.current?.focus(); };

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab") setOpen(false);
  };

  const rowH = 40;
  return (
    <div className={`field select ${open ? "is-open" : ""} ${error ? "is-error" : ""}`} ref={root} style={width ? { width } : undefined}>
      <span className="field-label" id={`${id}-label`}>{label}</span>
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKey}
      >
        <span id={`${id}-value`}>{value}</span>
        <Icon name="chevron-down" size={16} className="select-chevron" />
      </button>
      {open && pos && createPortal(
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className={`menu ${pos.bottom !== undefined ? "menu-up" : ""}`}
          style={{
            position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, right: "auto", margin: 0,
            maxHeight: options.length > maxVisible ? Math.min(rowH * maxVisible + 8, pos.maxH) : pos.maxH,
          }}
        >
          {options.map((o, i) => (
            <li
              key={o}
              id={`${id}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={o === value}
              className={`menu-item ${i === active ? "is-active" : ""} ${o === value ? "is-selected" : ""}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span>{o}</span>
              {o === value && <Icon name="check" size={16} />}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
