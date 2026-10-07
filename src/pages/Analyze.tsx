import { useEffect, useState } from "react";
import { FEATURE_ORDER } from "../types/fraud";
import { predict } from "../services/fraudModel";
import { PageHeader, RiskBadge } from "../components/ui";
import { loadJson } from "../lib/data";

export default function Analyze() {
  const [vals, setVals] = useState<Record<string, number>>({ Time: 0, Amount: 100, ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, 0])) });
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState<any[]>([]);
  useEffect(() => { loadJson("/data/demo_transactions.json", []).then(({ data }) => setDemo(Array.isArray(data) ? data : [])); }, []);
  const set = (k: string, v: number) => setVals(s => ({ ...s, [k]: v }));
  const run = async () => { setLoading(true); try { setRes(await predict(vals)); } finally { setLoading(false); } };
  return (
    <div>
      <PageHeader title="Analyze Transaction" sub="30 numerical inputs. V1–V28 are anonymized PCA components — no invented meanings." />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <label className="text-sm">Time (seconds from first transaction)<input className="input mt-1" type="number" value={vals.Time} onChange={e => set("Time", Number(e.target.value))} /></label>
          <label className="text-sm block mt-3">Amount<input className="input mt-1" type="number" value={vals.Amount} onChange={e => set("Amount", Number(e.target.value))} /></label>
          <details className="mt-3"><summary className="text-sm cursor-pointer">Advanced anonymized features (V1–V28)</summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {FEATURE_ORDER.filter(f => f.startsWith("V")).map(f => (
                <label key={f} className="text-xs">{f}<input className="input" type="number" step="any" value={vals[f]} onChange={e => set(f, Number(e.target.value))} /></label>
              ))}
            </div>
          </details>
          <div className="flex gap-2 mt-4 flex-wrap">
            <button className="btn-primary" disabled={loading} onClick={run}>{loading ? "Scoring…" : "Analyze"}</button>
            <button className="btn-ghost" onClick={() => demo.length && setVals({ ...vals, ...Object.fromEntries(FEATURE_ORDER.map(k => [k, Number((demo.find((d: any) => d.label === 0) || {})[k] ?? 0)])) })}>Load safe example</button>
            <button className="btn-ghost" onClick={() => demo.length && setVals({ ...vals, ...Object.fromEntries(FEATURE_ORDER.map(k => [k, Number((demo.find((d: any) => d.label === 1) || {})[k] ?? 0)])) })}>Load suspicious example</button>
          </div>
        </div>
        <div className="card">
          {!res ? <p className="muted text-sm">Run analysis to see fraud probability, threshold and risk band.</p> : (
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-semibold ${res.predictedClass ? "text-red-700" : "text-green-700"}`}>{res.predictedClass ? "FRAUDULENT" : "LEGITIMATE"}</span>
                <RiskBadge risk={res.risk} />
              </div>
              <p className="text-sm mt-1">{res.predictedClass ? "The model estimates this transaction as high risk." : "The model estimates this transaction as low risk."}</p>
              <div className="mt-3 text-sm">Fraud probability: <b>{(res.fraudProbability * 100).toFixed(2)}%</b> · Threshold: <b>{Number(res.threshold).toFixed(3)}</b></div>
              <div className="h-2 bg-stone-200 rounded mt-2"><div className="h-2 rounded bg-slate-900" style={{ width: `${Math.round(res.fraudProbability * 100)}%` }} /></div>
            </div>
          )}
          <p className="muted text-xs mt-4">Predictions are for demonstration and educational purposes and should not be used as the sole basis for a real financial decision.</p>
        </div>
      </div>
    </div>
  );
}
