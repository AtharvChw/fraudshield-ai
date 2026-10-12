import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Step {
  route: string;
  target?: string; // [data-tour] selector
  title: string;
  caption: string;
  action?: () => Promise<void>;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function clickAttr(attr: string) {
  for (let i = 0; i < 40; i++) {
    const el = document.querySelector(`[data-tour="${attr}"]`) as HTMLElement | null;
    // wait until present AND enabled (demo data may still be loading)
    if (el && !(el as HTMLButtonElement).disabled) { el.click(); return; }
    await sleep(300);
  }
}

async function autoAnalyze() {
  await clickAttr("load-fraud");
  await sleep(600);
  await clickAttr("analyze-btn");
  await sleep(2500);
}

async function autoBatch() {
  for (let i = 0; i < 20; i++) {
    const input = document.querySelector('[data-tour="csv-input"]') as HTMLInputElement | null;
    if (input) {
      const res = await fetch("/data/demo_transactions.csv");
      const blob = await res.blob();
      const file = new File([blob], "demo_transactions.csv", { type: "text/csv" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    await sleep(300);
  }
}

const STEPS: Step[] = [
  { route: "/", title: "The problem", caption: "284,807 transactions. Only 492 are fraud — 0.17%. A model guessing “legitimate” every time scores 99.8% accuracy and catches nothing.", target: "kpis" },
  { route: "/", title: "Where fraud hides", caption: "Fraud clusters in tiny amounts — 181 of 492 frauds sit in the $0–1 bin. Watch the red stack on the left.", target: "amount-chart" },
  { route: "/analyze", title: "Live prediction", caption: "Loading a real fraud case and scoring it with a Random Forest running inside your browser…", target: "analyze-result", action: autoAnalyze },
  { route: "/batch", title: "Batch scan", caption: "Scoring a whole CSV locally — no server, no uploads. Summary, risk table, downloadable results.", target: "batch-results", action: autoBatch },
  { route: "/insights", title: "The proof", caption: "Random Forest + SMOTE on top. Confusion matrix, ROC/PR curves — and the alert budget: reviewing the top 1% catches 91% of fraud.", target: "model-comparison" },
  { route: "/about", title: "Private by design", caption: "Inference never leaves this browser. Educational demo — risk estimates, not proof of fraud. Tour complete!", },
];

export default function GuidedDemo({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [settled, setSettled] = useState(0);
  const done = useRef<Set<number>>(new Set());

  const step = STEPS[idx];

  // enter step: navigate, run action once, position spotlight
  useEffect(() => {
    let alive = true;
    (async () => {
      nav(step.route);
      await sleep(700);
      if (!alive) return;
      if (step.action && !done.current.has(idx)) {
        done.current.add(idx);
        await step.action();
        if (!alive) return;
      }
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(400);
        if (alive) setBox(el.getBoundingClientRect());
      } else setBox(null);
      if (alive) setSettled(s => s + 1); // restart dwell timer only after action settles
    })();
    return () => { alive = false; };
  }, [idx]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // autoplay: dwell starts after the step's action has settled
  useEffect(() => {
    if (!playing) return;
    if (idx >= STEPS.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, STEPS.length - 1)), 8000);
    return () => clearTimeout(t);
  }, [idx, playing, settled]);

  // keep spotlight glued on scroll/resize
  useEffect(() => {
    const upd = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      setBox(el ? el.getBoundingClientRect() : null);
    };
    window.addEventListener("scroll", upd, true);
    window.addEventListener("resize", upd);
    return () => { window.removeEventListener("scroll", upd, true); window.removeEventListener("resize", upd); };
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/40" />
      {box && (
        <div
          className="absolute border-4 border-amber-400 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.45)] transition-all duration-500"
          style={{ top: box.top - 8, left: box.left - 8, width: box.width + 16, height: box.height + 16 }}
        />
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(36rem,92vw)] pointer-events-auto">
        <div className="card !p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs muted">
            <span className="font-semibold text-amber-600">GUIDED DEMO</span>
            <span>{idx + 1} / {STEPS.length}</span>
            <div className="flex gap-1 ml-1">
              {STEPS.map((_, i) => (
                <span key={i} className={`w-2 h-2 rounded-full ${i <= idx ? "bg-amber-400" : "bg-stone-300 dark:bg-slate-600"}`} />
              ))}
            </div>
          </div>
          <h3 className="font-semibold mt-1">{step.title}</h3>
          <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">{step.caption}</p>
          <div className="flex gap-2 mt-3">
            <button className="btn-ghost !py-1.5 text-sm" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>Back</button>
            <button className="btn-ghost !py-1.5 text-sm" onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</button>
            {idx < STEPS.length - 1
              ? <button className="btn-primary !py-1.5 text-sm" onClick={() => setIdx(i => i + 1)}>Next</button>
              : <button className="btn-primary !py-1.5 text-sm" onClick={onClose}>Finish</button>}
            <button className="ml-auto text-sm muted hover:underline" onClick={onClose}>End tour</button>
          </div>
        </div>
      </div>
    </div>
  );
}
