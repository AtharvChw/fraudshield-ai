import { FEATURE_ORDER, Prediction, riskBand } from "../types/fraud";

let session: any = null;
let ortNs: any = null;
let threshold = 0.5;
let ready = false;

// onnxruntime-web is loaded from CDN, never bundled: its threaded wasm
// (~27 MiB) exceeds Cloudflare Pages' 25 MiB file cap, and the JSEP proxy
// loader resolves wasm relative to the JS file (ignoring wasmPaths), so a
// fully-CDN runtime is the only setup where the wasm URL is correct.
// Pinned to the installed npm version. If the CDN is unreachable,
// inference falls back to demo mode in predict().
const ORT_CDN =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.bundle.min.mjs";

async function ensureSession() {
  if (session) return session;
  try {
    ortNs = await import(/* @vite-ignore */ ORT_CDN);
  } catch {
    session = null;
    ready = false;
    return session;
  }
  // try real model, fall back to null (demo mode)
  try {
    const metaRes = await fetch("/data/model_metrics.json");
    if (metaRes.ok) {
      const m = await metaRes.json();
      if (typeof m.threshold === "number") threshold = m.threshold;
    }
  } catch {}
  try {
    session = await ortNs.InferenceSession.create("/models/fraud_model.onnx");
    ready = true;
  } catch {
    session = null;
    ready = false;
  }
  return session;
}

export async function modelStatus() {
  await ensureSession();
  return { ready, threshold };
}

export async function predict(values: Record<string, number>): Promise<Prediction> {
  const s = await ensureSession();
  const input = new Float32Array(FEATURE_ORDER.map(k => Number(values[k] ?? 0)));
  let p = 0;
  if (s && ortNs) {
    const tensor = new ortNs.Tensor("float32", input, [1, FEATURE_ORDER.length]);
    const out = await s.run({ input: tensor });
    // zipmap=False model yields 'label' + 'output_probability' tensors;
    // scan every output for the 2-column probability matrix.
    let found = false;
    for (const k of Object.keys(out)) {
      const d = out[k].data as ArrayLike<number>;
      if (d.length === 2 && !found) { p = Number(d[1]); found = true; }
    }
    if (!found) {
      const k = Object.keys(out)[0];
      const d = out[k].data as ArrayLike<number>;
      p = Number(d[0]);
      if (p > 1 || p < 0) p = 1 / (1 + Math.exp(-p));
    }
  } else {
    // demo fallback: logistic on Amount only, clearly labeled upstream
    const amt = Number(values["Amount"] ?? 0);
    p = 1 / (1 + Math.exp(-(amt - 500) / 200));
  }
  const cls = (p >= threshold ? 1 : 0) as 0 | 1;
  return { fraudProbability: p, legitProbability: 1 - p, predictedClass: cls, threshold, risk: riskBand(p, threshold) };
}

export { FEATURE_ORDER };
