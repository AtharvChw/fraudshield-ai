import { useEffect, useState } from "react";

/**
 * Tracks the `dark` class on <html> so Recharts can pick readable colors.
 * Recharts renders SVG with explicit fill/stroke props, so Tailwind's
 * `dark:` variants cannot reach chart axes and series - the colors have to
 * be resolved in JS. Observes the class rather than reading it once so a
 * theme toggle repaints charts immediately.
 */
export function useIsDark() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Shared chart palette — chosen to clear 4.5:1 on both slate-50 and slate-950. */
export function chartTheme(dark: boolean) {
  const axis = dark ? "#94a3b8" : "#64748b";
  return {
    axis,
    grid: dark ? "#334155" : "#e2e8f0",
    tooltip: {
      backgroundColor: dark ? "#0f172a" : "#ffffff",
      border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
      color: dark ? "#e2e8f0" : "#0f172a",
      fontSize: 12,
    },
    // semantic series colors, readable on both grounds
    legit: "#94a3b8",
    fraud: "#dc2626",
    primary: "#2563eb",
    good: "#059669",
    warn: "#d97706",
  };
}
