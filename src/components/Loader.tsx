import { Icon } from "./Icon";

/** Calm “orbit” loader: inner orbit clockwise, outer counter-clockwise. Static with prefers-reduced-motion. */
export function OrbitLoader({ size = 176 }: { size?: number }) {
  const dots = (r: number, cls: string) =>
    [0, 120, 240].map((a) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return <circle key={a} className={cls} cx={88 + r * Math.cos(rad)} cy={88 + r * Math.sin(rad)} r={cls === "dot-inner" ? 4.5 : 3} />;
    });
  return (
    <div className="orbit" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 176 176" width={size} height={size}>
        <circle className="orbit-track" cx="88" cy="88" r="46" />
        <circle className="orbit-track" cx="88" cy="88" r="76" />
        <g className="orbit-inner">{dots(46, "dot-inner")}</g>
        <g className="orbit-outer">{dots(76, "dot-outer")}</g>
      </svg>
      <div className="orbit-core"><Icon name="chip" size={22} /></div>
    </div>
  );
}

export type StageState = "pending" | "active" | "done";

export function CreationProgress({ stage, labels }: { stage: number; labels: string[] }) {
  const pct = [0, 25, 60, 90, 100][stage] ?? 100;
  return (
    <div className="creation">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Creating virtual machine">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <ol className="stages">
        {labels.map((l, i) => {
          const st: StageState = i + 1 < stage ? "done" : i + 1 === stage ? "active" : "pending";
          return (
            <li key={l} className={`stage stage-${st}`}>
              <span className="stage-icon" aria-hidden="true">
                {st === "done" ? <Icon name="check-circle" size={16} /> : st === "active" ? <span className="spinner" /> : <span className="pending-dot" />}
              </span>
              <span>{l}</span>
              <span className="sr-only">{st === "done" ? " — done" : st === "active" ? " — in progress" : " — waiting"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
