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
  // metadata + calibration are best-effort; the model itself decides `ready`
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

/** True only when the real ONNX model is loaded and usable. */
export async function modelStatus() {
  await ensureSession();
  return { ready, threshold };
}

/**
 * Pulls the positive-class probability out of the model's outputs.
 * zipmap=False gives a [n, 2] probability matrix; we take the second column.
 * Returns null when no output looks like that matrix.
 */
function extractProbs(out: Record<string, any>, n: number): number[] | null {
  for (const k of Object.keys(out)) {
    const d = out[k].data as ArrayLike<number>;
    if (d && d.length === n * 2) {
      const probs = new Array<number>(n);
      for (let i = 0; i < n; i++) probs[i] = Number(d[i * 2 + 1]);
      return probs;
    }
  }
  return null;
}

function finalize(p: number, demoMode: boolean): Prediction {
  const cls = (p >= threshold ? 1 : 0) as 0 | 1;
  return {
    fraudProbability: p,
    legitProbability: 1 - p,
    predictedClass: cls,
    threshold,
    risk: riskBand(p, threshold),
    demoMode,
  };
}

/**
 * Scores many rows in ONE ONNX run — the model's input axis is dynamic, so a
 * [n, 30] tensor is valid. This is what Batch uses: one session call instead of
 * one per row (a 10k-row CSV used to mean 10k sequential runs + React renders).
 * Single-row prediction routes through here too, so the two paths can never
 * drift apart.
 */
export async function predictMany(rows: Record<string, number>[]): Promise<Prediction[]> {
  if (!rows.length) return [];
  const s = await ensureSession();
  const n = rows.length;

  if (s && ortNs) {
    const flat = new Float32Array(n * FEATURE_ORDER.length);
    for (let i = 0; i < n; i++) {
      const row = rows[i];
      for (let j = 0; j < FEATURE_ORDER.length; j++) {
        flat[i * FEATURE_ORDER.length + j] = Number(row[FEATURE_ORDER[j]] ?? 0);
      }
    }

    // Preferred path: one [n, 30] run. The ONNX graph is exported with a
    // dynamic batch axis, but if a future re-export pins it to 1 this throws —
    // so we degrade to per-row runs on the SAME session rather than all the way
    // down to the heuristic. Both paths are the real model, so scores match.
    try {
      const tensor = new ortNs.Tensor("float32", flat, [n, FEATURE_ORDER.length]);
      const out = await s.run({ input: tensor });
      let probs = extractProbs(out, n);
      if (!probs) {
        // single-output fallback: raw scores, squashed if they are not probabilities
        const k = Object.keys(out)[0];
        const d = out[k].data as ArrayLike<number>;
        probs = Array.from({ length: n }, (_, i) => {
          const v = Number(d[i] ?? d[0]);
          return v > 1 || v < 0 ? 1 / (1 + Math.exp(-v)) : v;
        });
      }
      return probs.map(p => finalize(platt ? applyPlatt(p, platt.a, platt.b) : p, false));
    } catch {
      try {
        const single: number[] = [];
        for (let i = 0; i < n; i++) {
          const one = new ortNs.Tensor("float32", flat.slice(i * FEATURE_ORDER.length, (i + 1) * FEATURE_ORDER.length), [1, FEATURE_ORDER.length]);
          const out = await s.run({ input: one });
          const probs = extractProbs(out, 1);
          if (probs) single.push(probs[0]);
          else {
            const k = Object.keys(out)[0];
            const v = Number((out[k].data as ArrayLike<number>)[0]);
            single.push(v > 1 || v < 0 ? 1 / (1 + Math.exp(-v)) : v);
          }
        }
        return single.map(p => finalize(platt ? applyPlatt(p, platt.a, platt.b) : p, false));
      } catch {
        // fall through to the heuristic below
      }
    }
  }

  // Honest fallback: a heuristic, NOT the trained model. Every Prediction
  // carries demoMode=true so the UI can label it instead of passing it off.
  return rows.map(row => {
    const amt = Number(row["Amount"] ?? 0);
    return finalize(1 / (1 + Math.exp(-(amt - 500) / 200)), true);
  });
}

export async function predict(values: Record<string, number>): Promise<Prediction> {
  const [p] = await predictMany([values]);
  return p;
}

export { FEATURE_ORDER };
