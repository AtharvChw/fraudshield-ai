import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { PageHeader } from "../components/ui";
import { loadJson } from "../lib/data";

export default function Insights() {
  const [comp, setComp] = useState<any[]>([]);
  const [roc, setRoc] = useState<any>({ fpr: [], tpr: [] });
  const [pr, setPr] = useState<any>({ precision: [], recall: [] });
  const [thr, setThr] = useState<any>({ selected: 0.5, curve: [] });
  const [cm, setCm] = useState<number[][]>([[0, 0], [0, 0]]);
  const [pak, setPak] = useState<any[]>([]);
  useEffect(() => {
    loadJson("/data/model_comparison.json", []).then(({ data }) => setComp(Array.isArray(data) ? data : []));
    loadJson("/data/roc_curve.json", { fpr: [], tpr: [] }).then(({ data }) => setRoc(data));
    loadJson("/data/pr_curve.json", { precision: [], recall: [] }).then(({ data }) => setPr(data));
    loadJson("/data/threshold_analysis.json", { selected: 0.5, curve: [] }).then(({ data }) => setThr(data));
    loadJson("/data/confusion_matrix.json", { matrix: [[0, 0], [0, 0]] }).then(({ data }) => setCm(data.matrix ?? [[0, 0], [0, 0]]));
    loadJson("/data/precision_at_k.json", []).then(({ data }) => setPak(Array.isArray(data) ? data : []));
  }, []);
  const rocData = (roc.fpr || []).map((f: number, i: number) => ({ fpr: f, tpr: roc.tpr[i] }));
  const prData = (pr.recall || []).map((r: number, i: number) => ({ recall: r, precision: pr.precision[i] }));
  return (
    <div>
      <PageHeader title="Model Insights" sub="How the detector was trained, tuned and why PR-AUC matters for rare fraud." />
      <div className="card"><h3 className="font-medium">The problem</h3><p className="text-sm text-stone-600 mt-1">Fraud is ~0.17% of transactions. Accuracy misleads; we optimize Precision (of predicted fraud, how many real?), Recall (of real fraud, how many caught?), F1 and PR-AUC (ranking quality when positives are rare).</p></div>
      <div className="card mt-4"><h3 className="font-medium">Model comparison</h3>
        <div className="overflow-auto"><table className="text-xs w-full mt-2"><thead><tr>{["Model", "Precision", "Recall", "F1", "ROC-AUC", "PR-AUC"].map(h => <th key={h} className="text-left p-1 border-b">{h}</th>)}</tr></thead>
        <tbody>{comp.map((c: any, i: number) => <tr key={i}><td className="p-1 border-b">{c.model}</td><td className="p-1 border-b">{Number(c.precision).toFixed(3)}</td><td className="p-1 border-b">{Number(c.recall).toFixed(3)}</td><td className="p-1 border-b">{Number(c.f1).toFixed(3)}</td><td className="p-1 border-b">{Number(c.roc_auc).toFixed(3)}</td><td className="p-1 border-b">{Number(c.pr_auc).toFixed(3)}</td></tr>)}</tbody></table></div>
        <div className="h-56 mt-4"><ResponsiveContainer><BarChart data={comp.map((c: any) => ({ n: c.model, f1: c.f1 }))}><XAxis dataKey="n" fontSize={10} /><YAxis /><Tooltip /><Bar dataKey="f1" /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="card"><h3 className="font-medium">ROC curve</h3><div className="h-56"><ResponsiveContainer><LineChart data={rocData}><XAxis dataKey="fpr" /><YAxis /><Tooltip /><Line type="monotone" dataKey="tpr" dot={false} /></LineChart></ResponsiveContainer></div></div>
        <div className="card"><h3 className="font-medium">Precision–Recall curve</h3><div className="h-56"><ResponsiveContainer><LineChart data={prData}><XAxis dataKey="recall" /><YAxis /><Tooltip /><Line type="monotone" dataKey="precision" dot={false} /></LineChart></ResponsiveContainer></div></div>
      </div>
      <div className="card mt-4"><h3 className="font-medium">Confusion matrix (test set)</h3>
        <div className="grid grid-cols-2 gap-2 max-w-sm mt-3 text-sm">
          <div className="border rounded-xl p-3 bg-green-50"><div className="font-medium">True Negative</div><div className="kpi">{cm[0][0].toLocaleString()}</div><div className="muted">legit, called legit</div></div>
          <div className="border rounded-xl p-3 bg-yellow-50"><div className="font-medium">False Positive</div><div className="kpi">{cm[0][1].toLocaleString()}</div><div className="muted">legit, flagged fraud</div></div>
          <div className="border rounded-xl p-3 bg-orange-50"><div className="font-medium">False Negative</div><div className="kpi">{cm[1][0].toLocaleString()}</div><div className="muted">fraud missed — the dangerous error</div></div>
          <div className="border rounded-xl p-3 bg-red-50"><div className="font-medium">True Positive</div><div className="kpi">{cm[1][1].toLocaleString()}</div><div className="muted">fraud caught</div></div>
        </div>
      </div>
      <div className="card mt-4"><h3 className="font-medium">Alert budget — precision at k</h3>
        <p className="text-sm text-stone-600 mt-1">If reviewers can only check the riskiest slice of traffic, what do they get? Reviewing the top 1% catches 91% of fraud.</p>
        <div className="overflow-auto"><table className="text-xs w-full mt-2"><thead><tr>{["Top slice", "Flagged", "Precision", "Recall"].map(h => <th key={h} className="text-left p-1 border-b">{h}</th>)}</tr></thead>
        <tbody>{pak.map((r: any, i: number) => <tr key={i}><td className="p-1 border-b">top {r.k_pct}%</td><td className="p-1 border-b">{Number(r.flagged).toLocaleString()}</td><td className="p-1 border-b">{(Number(r.precision) * 100).toFixed(1)}%</td><td className="p-1 border-b">{(Number(r.recall) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>
      </div>
      <div className="card mt-4"><h3 className="font-medium">Threshold (selected {Number(thr.selected).toFixed(3)})</h3><div className="h-56"><ResponsiveContainer><LineChart data={thr.curve}><XAxis dataKey="threshold" /><YAxis /><Tooltip /><Line type="monotone" dataKey="precision" dot={false} /><Line type="monotone" dataKey="recall" dot={false} /><Line type="monotone" dataKey="f1" dot={false} /></LineChart></ResponsiveContainer></div>
      <p className="text-sm text-stone-600 mt-2">creditcard.csv → Python pipeline → evaluation → ONNX → React → ONNX Runtime Web → Cloudflare Pages. V1–V28 are anonymized PCA components; importance = model influence, not causality.</p></div>
    </div>
  );
}
