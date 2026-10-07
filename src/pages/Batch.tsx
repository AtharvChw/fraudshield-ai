import { useState } from "react";
import Papa from "papaparse";
import { FEATURE_ORDER } from "../types/fraud";
import { predict } from "../services/fraudModel";
import { validateCsv } from "../lib/csv";
import { PageHeader } from "../components/ui";

export default function Batch() {
  const [rows, setRows] = useState<any[]>([]);
  const [scored, setScored] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const onFile = (f: File) => {
    setError(null);
    setInfo(null);
    setScored([]);
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
        const out: any[] = [];
        for (let i = 0; i < data.length; i++) {
          const r = data[i];
          const vals: Record<string, number> = {};
          for (const k of FEATURE_ORDER) {
            const n = Number(r[k]);
            vals[k] = Number.isNaN(n) ? 0 : n;
          }
          try {
            const p = await predict(vals);
            out.push({ ...r, FraudProbability: p.fraudProbability.toFixed(4), PredictedClass: p.predictedClass, RiskLevel: p.risk });
          } catch { out.push({ ...r, FraudProbability: "err", PredictedClass: "", RiskLevel: "" }); }
          if (i % 50 === 0) { setScored([...out]); await new Promise(r => setTimeout(r, 0)); }
        }
        setScored(out);
        setBusy(false);
      },
      error: (e) => setError(`Could not parse CSV: ${e.message}`)
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
        <input type="file" accept=".csv" onChange={e => e.target.files && onFile(e.target.files[0])} />
        <p className="muted text-xs mt-2">Analysis runs locally in your browser. Uploaded transaction data is not sent to a prediction server.</p>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3" role="alert">{error}</p>}
        {info && <p className="muted text-xs mt-2">{info}</p>}
        {!scored.length && !rows.length && !error && <p className="muted text-sm mt-3">Upload a CSV to begin — required columns: Time, V1…V28, Amount. Try the demo file at <code>/data/demo_transactions.csv</code>.</p>}
      </div>
      {!!scored.length && (
        <div className="card mt-4">
          {(() => {
            const probs = scored.map(r => Number(r.FraudProbability)).filter(n => !Number.isNaN(n));
            const avg = probs.length ? probs.reduce((a, b) => a + b, 0) / probs.length : 0;
            const top = scored.reduce((a, b) => Number(b.FraudProbability) > Number(a.FraudProbability) ? b : a, scored[0]);
            const flagged = scored.filter(r => String(r.PredictedClass) === "1").length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                <div><div className="muted">Total rows</div><div className="kpi">{scored.length}</div></div>
                <div><div className="muted">Flagged fraud</div><div className="kpi">{flagged} ({(flagged / scored.length * 100).toFixed(1)}%)</div></div>
                <div><div className="muted">Avg fraud prob</div><div className="kpi">{(avg * 100).toFixed(2)}%</div></div>
                <div><div className="muted">Highest-risk txn</div><div className="kpi">{(Number(top.FraudProbability) * 100).toFixed(2)}%</div><div className="muted">Amount {top.Amount}</div></div>
              </div>
            );
          })()}
          <div className="text-sm mb-2">{busy && "Scoring…"}</div>
          <div className="overflow-auto max-h-96">
            <table className="text-xs w-full">
              <thead><tr>{["FraudProbability", "PredictedClass", "RiskLevel", "Amount"].map(h => <th key={h} className="text-left p-1 border-b">{h}</th>)}</tr></thead>
              <tbody>{scored.slice(0, 200).map((r, i) => <tr key={i}><td className="p-1 border-b">{r.FraudProbability}</td><td className="p-1 border-b">{r.PredictedClass}</td><td className="p-1 border-b">{r.RiskLevel}</td><td className="p-1 border-b">{r.Amount}</td></tr>)}</tbody>
            </table>
          </div>
          <button className="btn-primary mt-3" onClick={download} disabled={busy}>Download scored CSV</button>
        </div>
      )}
      {!scored.length && !!rows.length && <p className="muted text-sm mt-2">Parsed {rows.length} rows…</p>}
    </div>
  );
}
