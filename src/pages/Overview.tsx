import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard, PageHeader } from "../components/ui";
import { loadJson } from "../lib/data";

export default function Overview() {
  const [dash, setDash] = useState<any>({ total: "—", fraud: "—", fraud_rate: 0, model: "pending", precision: 0, recall: 0, f1: 0, pr_auc: 0 });
  const [fallback, setFallback] = useState(true);
  const [amt, setAmt] = useState<any>({ bins: [], legit: [], fraud: [] });
  useEffect(() => {
    loadJson("/data/dashboard_statistics.json", { total: 284807, fraud: 492, fraud_rate: 0.0017, model: "not-trained", precision: 0, recall: 0, f1: 0, pr_auc: 0 }).then(({ data, isFallback }) => { setDash(data); setFallback(isFallback); });
    loadJson("/data/amount_histogram.json", { bins: [], legit: [], fraud: [] }).then(({ data }) => setAmt(data));
  }, []);
  const amtData = (amt.bins || []).map((b: string, i: number) => ({ bin: b, Legit: amt.legit[i], Fraud: amt.fraud[i] }));
  return (
    <div>
      <PageHeader title="FraudShield AI" sub="Intelligent transaction risk detection, powered by machine learning." />
      {fallback && <div className="card mb-4 text-sm">The ML pipeline has not yet generated production artifacts. Place creditcard.csv in ml/data/ and run: <code>python ml/run_pipeline.py</code></div>}
      <div className="flex gap-3 mb-6">
        <Link to="/analyze" className="btn-primary">Analyze Transaction</Link>
        <Link to="/batch" className="btn-ghost">Batch Scan CSV</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Transactions" value={String(dash.total)} />
        <MetricCard label="Fraud cases" value={String(dash.fraud)} />
        <MetricCard label="Fraud rate" value={`${(Number(dash.fraud_rate) * 100).toFixed(3)}%`} />
        <MetricCard label="Production model" value={String(dash.model)} sub={`R ${Number(dash.recall).toFixed(2)} · P ${Number(dash.precision).toFixed(2)} · PR-AUC ${Number(dash.pr_auc).toFixed(2)}`} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
      <div className="card">
        <h3 className="font-medium mb-2">Class distribution</h3>
        <div className="h-48 mt-4">
          <ResponsiveContainer>
            <BarChart data={[{ n: "Legit", v: Number(dash.total) - Number(dash.fraud || 0) }, { n: "Fraud", v: Number(dash.fraud || 0) }]}>
              <XAxis dataKey="n" /><YAxis /><Tooltip />
              <Bar dataKey="v" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3 className="font-medium mb-2">Amount by class</h3>
        <p className="muted text-xs">Fraud clusters in tiny amounts — 181 of 492 frauds sit in the $0–1 bin.</p>
        <div className="h-48 mt-2">
          <ResponsiveContainer>
            <BarChart data={amtData}>
              <XAxis dataKey="bin" fontSize={9} interval={1} /><YAxis /><Tooltip />
              <Bar dataKey="Legit" stackId="a" fill="#94a3b8" />
              <Bar dataKey="Fraud" stackId="a" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
      <div className="card mt-4">
        <h3 className="font-medium mb-2">Why 99% accuracy can still be a bad fraud detector</h3>
        <p className="text-sm text-stone-600">A model can achieve extremely high accuracy by predicting almost every transaction as legitimate, which is why FraudShield AI prioritizes Precision, Recall, F1 and PR-AUC.</p>
      </div>
    </div>
  );
}
