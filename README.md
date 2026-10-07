# FraudShield AI

**Intelligent transaction risk detection, powered by machine learning — running 100% in your browser.**

Live demo: `https://fraudshield-ai-7hk.pages.dev` (spec target `fraudshield-ai.pages.dev` is taken — same app, Cloudflare-assigned suffix)

![status](https://img.shields.io/badge/model-random__forest__smote-slate) ![PR-AUC](https://img.shields.io/badge/PR--AUC-0.86-green) ![ONNX](https://img.shields.io/badge/inference-ONNX_Runtime_Web-blue)

## Problem

Credit-card fraud is ~**0.17%** of all transactions (492 of 284,807). A lazy model that predicts "legitimate" every time scores 99.8% accuracy while catching zero fraud — which is why FraudShield AI optimizes **Precision, Recall, F1 and PR-AUC**, never accuracy.

- **Precision** — of transactions flagged as fraud, how many really were?
- **Recall** — of all real frauds, how many did we catch? (misses cost real money)
- **PR-AUC** — ranking quality when positives are vanishingly rare.

## Dataset

Kaggle *Credit Card Fraud Detection*: `Time`, `V1…V28` (anonymized PCA components — no invented meanings), `Amount`, `Class` (0 = legit, 1 = fraud). Place it at `ml/data/creditcard.csv` (see `ml/data/README.md`).

## Architecture

```text
creditcard.csv → Python ML pipeline → evaluation → ONNX export
      → React + TypeScript app → ONNX Runtime Web → Cloudflare Pages
```

No Flask/FastAPI/Render — production inference happens on-device. CSV uploads never leave the browser.

## Results (real, from `python ml/run_pipeline.py` on the untouched test set)

| Model | Prec | Rec | F1 | ROC-AUC | PR-AUC |
|---|---|---|---|---|---|
| Logistic Regression (weighted) | 0.059 | 0.886 | 0.111 | 0.973 | 0.682 |
| Logistic Regression (SMOTE) | 0.137 | 0.861 | 0.237 | 0.969 | 0.708 |
| **Random Forest (SMOTE) — deployed** | **0.820** | **0.837** | **0.828** | **0.967** | **0.860** |
| Random Forest (weighted) | 0.949 | 0.709 | 0.812 | 0.947 | 0.811 |
| HistGradientBoosting (SMOTE) | 0.719 | 0.810 | 0.762 | 0.951 | 0.795 |

- **Deployed:** Random Forest + train-only SMOTE (best val PR-AUC), threshold **0.51** tuned on validation.
- **Test confusion matrix:** TN 56,846 · FP 18 · FN 16 · TP 82.
- **ONNX parity:** max probability diff 2.2e-10 (tolerance 1e-4).
- SMOTE helped the forest slightly (+0.004 PR-AUC) but wrecked logistic precision — so it was kept only where it helped.

## App pages

- **Overview** — KPIs + class-imbalance insight from real artifacts.
- **Analyze** — single transaction scorer (Time, Amount + collapsible V1–V28), safe/suspicious real-data examples, risk bands around the tuned threshold.
- **Batch Scan** — client-side CSV scoring with column validation, progress, filters and scored-CSV download.
- **Model Insights** — comparison table, confusion matrix, ROC / PR / threshold curves, imbalance strategy notes.
- **About** — stack, privacy-by-design, limits.

## Local setup

```bash
python -m venv .venv
.venv\Scripts\Activate        # Windows
pip install -r requirements.txt
# place ml/data/creditcard.csv, then:
python ml/run_pipeline.py
npm install
npm run dev     # app
npm test        # vitest
npm run build   # dist/
npm run preview
```

## Deploy (Cloudflare Pages)

Build command `npm run build`, output `dist`. SPA fallback (`public/_redirects`) and ONNX caching (`public/_headers`) included:

```bash
npx wrangler pages deploy dist --project-name fraudshield-ai
```

## Privacy & limits

No card numbers, CVV, names, or uploads to any server — educational demo, not bank-grade, not fraud-proof. Predictions are risk estimates, not proof.

## Future improvements

Probability calibration, SHAP-style model influence cards, IndexedDB batch history, dark mode, Precision@k alert-budget tuning.
