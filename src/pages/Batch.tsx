import { useState } from "react";
import Papa from "papaparse";
import { FEATURE_ORDER } from "../types/fraud";
import { predictMany } from "../services/fraudModel";
import { validateCsv } from "../lib/csv";
import { PageHeader } from "../components/ui";

/** Rows per ONNX run. The model's input axis is dynamic, so batching is free —
 *  this replaces one sequential session call per CSV row with one call per chunk. */
const CHUNK = 512;

export default function Batch() {
  const [rows, setRows] = useState<any[]>([]);
  const [scored, setScored] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onFile = (f: File) => {
    setError(null);
    setInfo(null);
    setScored([]);
    setDemoMode(false);
    setProgress(0);
    Papa.parse(f, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const data = (res.data as any[]).filter(r => Object.keys(r).length > 1);
        const headers = res.meta.fields ?? [];
        const v = validateCsv(headers, data);
        if (!v.ok) {
          setError(`Missing required columns: ${v.missing.join(", ")}. Expected Time, V1…V28, Amount.`);
          return;
        }
        if (v.rowCount === 0) {
          setError("No data rows found in this CSV.");
          return;
        }
        setRows(data);
        if (v.malformedRows > 0) setInfo(`${v.malformedRows} row(s) contain non-numeric values and will be treated as 0.`);
        setBusy(true);

        // coerce once, up front — every chunk then feeds the model clean numbers
        const numeric = data.map(r => {
          const vals: Record<string, number> = {};
          for (const k of FEATURE_ORDER) {
            const n = Number(r[k]);
            vals[k] = Number.isNaN(n) ? 0 : n;
          }
          return vals;
        });

        const out: any[] = [];
        let sawDemo = false;
        try {
          for (let start = 0; start < numeric.length; start += CHUNK) {
            const slice = numeric.slice(start, start + CHUNK);
            const preds = await predictMany(slice);
            for (let i = 0; i < slice.length; i++) {
              const p = preds[i];
              if (p.demoMode) sawDemo = true;
              out.push({
                ...data[start + i],
                FraudProbability: p.fraudProbability.toFixed(4),
                PredictedClass: p.predictedClass,
                RiskLevel: p.risk,
              });
            }
            setScored([...out]);
            setProgress(out.length);
            setDemoMode(sawDemo);
            // yield so the progress number actually paints between chunks
            await new Promise(r => setTimeout(r, 0));
          }
        } catch (e) {
          setError(`Scoring failed on row ${out.length + 1}: ${(e as Error).message}`);
        }

        setScored(out);
        setDemoMode(sawDemo);
        setBusy(false);
      },
      error: (e) => setError(`Could not parse CSV: ${e.message}`),
    });
  };

  const download = () => {
    const csv = Papa.unparse(scored);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "fraud_scored.csv";
    a.click();
  };

  return (
    <div>
      <PageHeader title="Batch Scan CSV" sub="Client-side scoring. Columns Time,V1..V28,Amount. Class optional." />
      <div className="card">
        <label className="text-sm block">
          <span className="muted">CSV file</span>
          <input
            type="file"
            accept=".csv"
            aria-label="Upload transaction CSV"
            data-tour="csv-input"
            className="mt-1"
            onChange={e => e.target.files && onFile(e.target.files[0])}
          />
        </label>
        <p className="muted text-xs mt-2">Analysis runs locally in your browser. Uploaded transaction data is not sent to a prediction server.</p>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800 rounded-lg px-3 py-2 mt-3" role="alert">{error}</p>}
        {info && <p className="muted text-xs mt-2">{info}</p>}
        {demoMode && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 dark:text-amber-200 dark:bg-amber-900/30 dark:border-amber-800 rounded-lg px-3 py-2 mt-3" role="status">
            <b>Demo mode.</b> The trained ONNX model did not load, so these scores come from a fallback heuristic based on transaction amount only. They are not model predictions — do not rely on them.
          </p>
        )}
        {!scored.length && !rows.length && !error && <p className="muted text-sm mt-3">Upload a CSV to begin — required columns: Time, V1…V28, Amount. Try the demo file at <code>/data/demo_transactions.csv</code>.</p>}
      </div>
      {!!scored.length && (
        <div className="card mt-4" data-tour="batch-results">
          {(() => {
            const probs = scored.map(r => Number(r.FraudProbability)).filter(n => !Number.isNaN(n));
            const avg = probs.length ? probs.reduce((a, b) => a + b, 0) / probs.length : 0;
            const top = scored.reduce((a, b) => Number(b.FraudProbability) > Number(a.FraudProbability) ? b : a, scored[0]);
            const flagged = scored.filter(r => String(r.PredictedClass) === "1").length;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                <div><div className="muted">Total rows</div><div className="kpi">{scored.length}</div></div>
                <div><div className="muted">Flagged fraud</div><div className="kpi">{flagged} ({(flagged / scored.length * 100).toFixed(1)}%)</div></div>
                <div><div className="muted">Avg fraud prob</div><div className="kpi">{(avg * 100).toFixed(2)}%</div></div>
                <div><div className="muted">Highest-risk txn</div><div className="kpi">{(Number(top.FraudProbability) * 100).toFixed(2)}%</div><div className="muted">Amount {top.Amount}</div></div>
              </div>
            );
          })()}
          {/* polite live region so screen readers hear progress and completion */}
          <div className="text-sm mb-2" role="status" aria-live="polite">
            {busy ? `Scoring… ${progress} of ${rows.length} rows` : `Scored ${scored.length} row${scored.length === 1 ? "" : "s"}.`}
          </div>
          <div className="overflow-auto max-h-96">
            <table className="text-xs w-full">
              <thead><tr>{["Fraud prob.", "PredictedClass", "RiskLevel", "Amount"].map(h => <th key={h} scope="col" className="text-left p-1 border-b">{h}</th>)}</tr></thead>
              <tbody>{scored.slice(0, 200).map((r, i) => <tr key={i}><td className="p-1 border-b">{r.FraudProbability === "err" ? "err" : `${(Number(r.FraudProbability) * 100).toFixed(2)}%`}</td><td className="p-1 border-b">{r.PredictedClass}</td><td className="p-1 border-b">{r.RiskLevel}</td><td className="p-1 border-b">{r.Amount}</td></tr>)}</tbody>
            </table>
          </div>
          {scored.length > 200 && <p className="muted text-xs mt-2">Table shows the first 200 rows; the downloaded CSV contains all {scored.length}.</p>}
          <button className="btn-primary mt-3" onClick={download} disabled={busy}>Download scored CSV</button>
        </div>
      )}
      {!scored.length && !!rows.length && <p className="muted text-sm mt-2">Parsed {rows.length} rows…</p>}
    </div>
  );
}
