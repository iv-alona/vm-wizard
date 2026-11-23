import { useEffect, useState } from "react";
import { Wizard, type Theme } from "./wizard/Wizard";

const readTheme = (): Theme => {
  try {
    const saved = localStorage.getItem("vm-wizard-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [failNext, setFailNext] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("vm-wizard-theme", theme); } catch { /* ignore */ }
  }, [theme]);

  return (
    <div className="page">
      <Wizard key={key} theme={theme} onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))} failNext={failNext} onFailConsumed={() => setFailNext(false)} />
      <aside className="demo" aria-label="Prototype controls">
        <p className="demo-title">Prototype controls</p>
        <p className="demo-text">Try the name <code>VMHome1</code> for the taken-name recovery, or type <code>100</code> with <code>MB</code> on CPU & RAM.</p>
        <label className="demo-switch">
          <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} />
          <span>Next “Create VM” fails (host RAM drops to 64 GB)</span>
        </label>
        <button className="demo-link" onClick={() => setKey((k) => k + 1)}>Restart wizard</button>
      </aside>
    </div>
  );
}
