export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="kpi mt-1">{value}</div>
      {sub && <div className="muted mt-1">{sub}</div>}
    </div>
  );
}
export function RiskBadge({ risk }: { risk: string }) {
  const color = risk === "Low" ? "bg-green-100 text-green-800" : risk === "Moderate" ? "bg-yellow-100 text-yellow-800" : risk === "Elevated" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{risk}</span>;
}
export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="muted mt-1">{sub}</p>
    </div>
  );
}
