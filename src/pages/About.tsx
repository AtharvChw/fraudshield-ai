import { PageHeader } from "../components/ui";
export default function About() {
  return (
    <div>
      <PageHeader title="About" sub="Objective, stack, privacy and limits." />
      <div className="card text-sm space-y-2">
        <p><b>Objective:</b> teach imbalanced fraud detection end-to-end with browser-local inference.</p>
        <p><b>Stack:</b> Python pandas/sklearn/imbalanced-learn/ONNX + React Vite TS Tailwind Recharts onnxruntime-web.</p>
        <p><b>Privacy by design:</b> FraudShield AI performs inference locally in the browser. The production application does not require transaction data to be sent to a remote prediction server.</p>
        <p><b>Limits:</b> educational model, no card numbers/CVV/names, not bank-grade or certified. Predictions are estimates, not proof of fraud.</p>
        <p><b>Deploy:</b> npm run build → dist → Cloudflare Pages (live at fraudshield-ai-7hk.pages.dev).</p>
      </div>
    </div>
  );
}
