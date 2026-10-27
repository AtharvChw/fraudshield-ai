import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { PageHeader } from "../components/ui";
import { loadJson } from "../lib/data";
import { useIsDark, chartTheme } from "../lib/useIsDark";

/** Full model ids are ~30 chars and collide on the axis; shorten for display only. */
const shortModel = (m: string) =>
  String(m)
    .replace(/logistic_regression/i, "log reg")
    .replace(/hist_gradient_boosting/i, "hist gb")
    .replace(/random_forest/i, "rf")
    .replace(/_/g, " ");

export default function Insights() {
  const dark = useIsDark();
  const t = chartTheme(dark);
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
  // artifacts are ordered by descending threshold, so recall descends; a PR curve
  // must read left-to-right, so reverse for display
  const prData = (pr.recall || []).map((r: number, i: number) => ({ recall: r, precision: pr.precision[i] })).reverse();
  return (
    <div>
      <PageHeader title="Model Insights" sub="How the detector was trained, tuned and why PR-AUC matters for rare fraud." />
      <div className="card"><h3 className="font-medium">The problem</h3><p className="text-sm text-stone-600 dark:text-slate-300 mt-1">Fraud is ~0.17% of transactions. Accuracy misleads; we optimize Precision (of predicted fraud, how many real?), Recall (of real fraud, how many caught?), F1 and PR-AUC (ranking quality when positives are rare).</p></div>
      <div className="card mt-4" data-tour="model-comparison"><h3 className="font-medium">Model comparison</h3>
        <div className="overflow-auto"><table className="text-xs w-full mt-2"><thead><tr>{["Model", "Precision", "Recall", "F1", "ROC-AUC", "PR-AUC"].map(h => <th key={h} className="text-left p-1 border-b">{h}</th>)}</tr></thead>
        <tbody>{comp.map((c: any, i: number) => <tr key={i}><td className="p-1 border-b">{c.model}</td><td className="p-1 border-b">{Number(c.precision).toFixed(3)}</td><td className="p-1 border-b">{Number(c.recall).toFixed(3)}</td><td className="p-1 border-b">{Number(c.f1).toFixed(3)}</td><td className="p-1 border-b">{Number(c.roc_auc).toFixed(3)}</td><td className="p-1 border-b">{Number(c.pr_auc).toFixed(3)}</td></tr>)}</tbody></table></div>
        <div className="h-56 mt-4"><ResponsiveContainer><BarChart data={comp.map((c: any) => ({ n: shortModel(c.model), f1: c.f1, deployed: c.model === "random_forest_smote" }))}><XAxis dataKey="n" stroke={t.axis} tick={{ fill: t.axis, fontSize: 10 }} /><YAxis stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} /><Tooltip contentStyle={t.tooltip} labelStyle={{ color: t.axis }} itemStyle={{ color: t.axis }} /><Bar dataKey="f1">{comp.map((c: any, i: number) => <Cell key={i} fill={c.model === "random_forest_smote" ? t.primary : t.legit} />)}</Bar></BarChart></ResponsiveContainer></div>
        <p className="muted text-xs mt-2">Bars are test-set F1 at each model's raw 0.5 cut-off. The deployed model is re-thresholded after Platt calibration, so its final numbers (F1 0.833) appear on the KPI and threshold cards — not in this pre-calibration table.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="card"><h3 className="font-medium">ROC curve</h3><div className="h-56"><ResponsiveContainer><LineChart data={rocData}><XAxis dataKey="fpr" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: any) => Number(v).toFixed(2)} /><YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: any) => Number(v).toFixed(2)} /><Tooltip contentStyle={t.tooltip} labelStyle={{ color: t.axis }} itemStyle={{ color: t.axis }} labelFormatter={(v: any) => `FPR ${Number(v).toFixed(3)}`} /><Line type="monotone" dataKey="tpr" dot={false} stroke={t.primary} strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
        <div className="card"><h3 className="font-medium">Precision–Recall curve</h3><div className="h-56"><ResponsiveContainer><LineChart data={prData}><XAxis dataKey="recall" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: any) => Number(v).toFixed(2)} /><YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: any) => Number(v).toFixed(2)} /><Tooltip contentStyle={t.tooltip} labelStyle={{ color: t.axis }} itemStyle={{ color: t.axis }} labelFormatter={(v: any) => `Recall ${Number(v).toFixed(3)}`} /><Line type="monotone" dataKey="precision" dot={false} stroke={t.good} strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
      </div>
      <div className="card mt-4"><h3 className="font-medium">Confusion matrix (test set)</h3>
        <div className="grid grid-cols-2 gap-2 max-w-sm mt-3 text-sm">
          <div className="border rounded-xl p-3 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800"><div className="font-medium">True Negative</div><div className="kpi">{cm[0][0].toLocaleString()}</div><div className="muted">legit, called legit</div></div>
          <div className="border rounded-xl p-3 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800"><div className="font-medium">False Positive</div><div className="kpi">{cm[0][1].toLocaleString()}</div><div className="muted">legit, flagged fraud</div></div>
          <div className="border rounded-xl p-3 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800"><div className="font-medium">False Negative</div><div className="kpi">{cm[1][0].toLocaleString()}</div><div className="muted">fraud missed — the dangerous error</div></div>
          <div className="border rounded-xl p-3 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800"><div className="font-medium">True Positive</div><div className="kpi">{cm[1][1].toLocaleString()}</div><div className="muted">fraud caught</div></div>
        </div>
      </div>
      <div className="card mt-4"><h3 className="font-medium">Alert budget — precision at k</h3>
        <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">If reviewers can only check the riskiest slice of traffic, what do they get? Reviewing the top 1% catches 91% of fraud.</p>
        <div className="overflow-auto"><table className="text-xs w-full mt-2"><thead><tr>{["Top slice", "Flagged", "Precision", "Recall"].map(h => <th key={h} className="text-left p-1 border-b">{h}</th>)}</tr></thead>
        <tbody>{pak.map((r: any, i: number) => <tr key={i}><td className="p-1 border-b">top {r.k_pct}%</td><td className="p-1 border-b">{Number(r.flagged).toLocaleString()}</td><td className="p-1 border-b">{(Number(r.precision) * 100).toFixed(1)}%</td><td className="p-1 border-b">{(Number(r.recall) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>
      </div>
      <div className="card mt-4"><h3 className="font-medium">Threshold (selected {Number(thr.selected).toFixed(3)})</h3><div className="h-56"><ResponsiveContainer><LineChart data={thr.curve}><XAxis dataKey="threshold" interval="preserveStartEnd" minTickGap={26} stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: any) => Number(v).toFixed(2)} /><YAxis stroke={t.axis} tick={{ fill: t.axis, fontSize: 11 }} /><Tooltip contentStyle={t.tooltip} labelStyle={{ color: t.axis }} itemStyle={{ color: t.axis }} /><Line type="monotone" dataKey="precision" dot={false} stroke={t.primary} strokeWidth={2} /><Line type="monotone" dataKey="recall" dot={false} stroke={t.fraud} strokeWidth={2} /><Line type="monotone" dataKey="f1" dot={false} stroke={t.warn} strokeWidth={2} /></LineChart></ResponsiveContainer></div>
      <p className="text-sm text-stone-600 dark:text-slate-300 mt-2">creditcard.csv → Python pipeline → evaluation → ONNX → React → ONNX Runtime Web → Cloudflare Pages. V1–V28 are anonymized PCA components; importance = model influence, not causality.</p></div>
    </div>
  );
}
