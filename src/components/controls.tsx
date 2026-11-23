import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

// ---------- Button

type Variant = "primary" | "neutral" | "subtle" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "neutral", size = "md", icon, children, className = "", ...rest },
  ref,
) {
  return (
    <button ref={ref} className={`btn btn-${variant} btn-${size} ${icon ? "has-icon" : ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 20} />}
      <span>{children}</span>
    </button>
  );
});

export function IconButton({ icon, label, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  );
}

// ---------- Field shell (label → hint → control → error / success)

interface FieldShellProps {
  label: string;
  /** Stable id for the control, so other UI (e.g. the error summary) can move focus to it. */
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
  after?: ReactNode;
  className?: string;
}

export function FieldShell({ label, id: fixedId, hint, error, success, children, after, className = "" }: FieldShellProps) {
  const id = useId();
  const inputId = fixedId ?? `${id}-input`;
  const hintId = hint ? `${id}-hint` : undefined;
  const msgId = error || success ? `${id}-msg` : undefined;
  const describedBy = [hintId, msgId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field ${error ? "is-error" : ""} ${className}`}>
      <label className="field-label" htmlFor={inputId}>{label}</label>
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {children({ inputId, describedBy })}
      {error && <p className="field-error" id={msgId} role="alert">{error}</p>}
      {!error && success && <p className="field-success" id={msgId}><Icon name="check" size={14} /> {success}</p>}
      {after}
    </div>
  );
}

// ---------- Text input

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  after?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, id, hint, error, success, after, className, ...input },
  ref,
) {
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} success={success} after={after} className={className}>
      {({ inputId, describedBy }) => (
        <input ref={ref} id={inputId} className="input" aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      )}
    </FieldShell>
  );
});

// ---------- Checkbox

export function Checkbox({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label className="checkbox" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={description ? `${id}-d` : undefined} />
      <span className="checkbox-box" aria-hidden="true"><Icon name="check" size={14} /></span>
      <span className="checkbox-text">
        <span className="checkbox-label">{label}</span>
        {description && <span className="checkbox-desc" id={`${id}-d`}>{description}</span>}
      </span>
    </label>
  );
}

// ---------- Tag & Banner

export const Tag = ({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" }) => (
  <span className={`tag tag-${tone}`}>{children}</span>
);

export function Banner({ title, children, tone = "danger" }: { title: string; children?: ReactNode; tone?: "danger" | "info" }) {
  const body = typeof children === "string" ? <p className="banner-body">{children}</p> : children;
  return (
    <div className={`banner banner-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={tone === "danger" ? "alert-triangle" : "info"} size={20} />
      <div>
        <p className="banner-title">{title}</p>
        {body}
      </div>
    </div>
  );
}
