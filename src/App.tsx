import { Link, Route, Routes, useLocation } from "react-router-dom";
import Overview from "./pages/Overview";
import Analyze from "./pages/Analyze";
import Batch from "./pages/Batch";
import Insights from "./pages/Insights";
import About from "./pages/About";
import { ShieldCheck } from "lucide-react";

const tabs = [
  ["Overview", "/"],
  ["Analyze", "/analyze"],
  ["Batch Scan", "/batch"],
  ["Model Insights", "/insights"],
  ["About", "/about"],
];

export default function App() {
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" />
          <span className="font-semibold">FraudShield AI</span>
          <nav className="ml-6 flex gap-1 text-sm">
            {tabs.map(([label, to]) => (
              <Link key={to} to={to} className={`px-3 py-1.5 rounded-lg ${loc.pathname === to ? "bg-slate-900 text-white" : "hover:bg-stone-100"}`}>{label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/about" element={<About />} />
        </Routes>
        <footer className="mt-16 text-xs text-stone-500">
          Predictions are for demonstration and educational purposes and should not be used as the sole basis for a real financial decision.
        </footer>
      </main>
    </div>
  );
}
