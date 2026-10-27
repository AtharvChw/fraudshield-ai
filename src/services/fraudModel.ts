import { FEATURE_ORDER, Prediction, riskBand } from "../types/fraud";

let session: any = null;
let ortNs: any = null;
let threshold = 0.5;
let platt: { a: number; b: number } | null = null;
let ready = false;

export function applyPlatt(p: number, a: number, b: number): number {
  return 1 / (1 + Math.exp(-(a * p + b)));
}

// ONNX Runtime Web, CPU-only build, served from OUR origin.
// Previously this was a dynamic import of the jsDelivr JSEP bundle, which
// pulls a 27 MiB wasm on every cold visit — too slow under load and a hard
// dependency on a third party for a live demo. The CPU build's wasm is
// 13.6 MiB and fits Cloudflare Pages' 25 MiB file cap, so it is copied into
// public/ort at build time (scripts/copy-ort.mjs) and resolved via wasmPaths.
// WebGPU buys nothing here: the model is a small random forest.
async function ensureSession() {
  if (session) return session;
  try {
    ortNs = await import("onnxruntime-web/wasm");
    // single thread: threaded wasm needs SharedArrayBuffer, which requires
    // COOP/COEP headers we do not set on Pages
    ortNs.env.wasm.numThreads = 1;
    ortNs.env.wasm.wasmPaths = "/ort/";
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
    const plattRes = await fetch("/data/platt.json");
    if (plattRes.ok) {
      const q = await plattRes.json();
      if (typeof q.a === "number" && typeof q.b === "number") platt = { a: q.a, b: q.b };
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
    // Platt calibration (sigmoid fitted on validation data) when available
    if (platt) p = applyPlatt(p, platt.a, platt.b);
  } else {
    // demo fallback: logistic on Amount only, clearly labeled upstream
    const amt = Number(values["Amount"] ?? 0);
    p = 1 / (1 + Math.exp(-(amt - 500) / 200));
  }
  const cls = (p >= threshold ? 1 : 0) as 0 | 1;
  return { fraudProbability: p, legitProbability: 1 - p, predictedClass: cls, threshold, risk: riskBand(p, threshold) };
}

export { FEATURE_ORDER };
