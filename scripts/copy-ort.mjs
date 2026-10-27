/**
 * Copies the ONNX Runtime Web CPU wasm into public/ort so the browser loads it
 * from our own origin instead of a 27 MB jsDelivr fetch on every cold visit.
 *
 * Why this shape:
 *  - Cloudflare Pages caps a single file at 25 MiB. The default JSEP/WebGPU
 *    build (ort-wasm-simd-threaded.jsep.wasm) is 27 MiB and cannot be hosted.
 *  - The CPU build (ort-wasm-simd-threaded.wasm) is ~13.6 MiB, so it fits.
 *  - We therefore import `onnxruntime-web/wasm` (CPU only) and point
 *    env.wasm.wasmPaths at /ort/. The model is a small random forest; WebGPU
 *    buys nothing, and a same-origin download is far more reliable for a demo.
 *
 * Runs on predev and prebuild. Idempotent: skips when sizes already match.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "fs";
import { dirname, join } from "path";

const src = "node_modules/onnxruntime-web/dist";
const dest = "public/ort";
const files = ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];

mkdirSync(dest, { recursive: true });

let copied = 0;
for (const f of files) {
  const from = join(src, f);
  const to = join(dest, f);
  if (!existsSync(from)) {
    console.error(`[copy-ort] MISSING ${from} — run npm install first`);
    process.exit(1);
  }
  const same = existsSync(to) && statSync(to).size === statSync(from).size;
  if (!same) {
    copyFileSync(from, to);
    copied++;
  }
}

const size = (statSync(join(dest, files[0])).size / 1048576).toFixed(1);
console.log(`[copy-ort] ${copied ? `${copied} file(s) copied` : "up to date"} · wasm ${size} MiB (Pages cap 25 MiB)`);
