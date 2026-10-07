# OpenCode Master Build Prompt — FraudShield AI

## Project Name

**FraudShield AI**

Target production URL:

**https://fraudshield-ai.pages.dev**

Project topic:

> Predict credit card fraud using the Credit Card Fraud Detection dataset.

---

# 1. Your Role

You are a senior **machine learning engineer, data scientist, frontend engineer, UI/UX designer, and deployment engineer**.

Build the complete project end-to-end.

Do not only scaffold files. Do not leave TODOs, fake buttons, placeholder analytics, unfinished routes, pseudocode, or unimplemented functions.

Work autonomously. Inspect the repository first, create the required structure, install appropriate dependencies, implement the full application, train/export the model when the dataset is available, validate the build, fix errors, and leave the repository ready for deployment.

If something can reasonably be decided without asking me, make the best technical decision yourself.

The finished project must be:

- academically correct
- technically impressive
- portfolio-ready
- visually polished
- responsive
- explainable
- deployable to Cloudflare Pages
- usable without a permanently running Python backend

---

# 2. Core Goal

Create a complete machine-learning web application called **FraudShield AI** that predicts whether a credit-card transaction is likely to be:

- **Legitimate**
- **Fraudulent**

The project must use the standard **Credit Card Fraud Detection dataset** containing:

- `Time`
- `V1` to `V28`
- `Amount`
- `Class`

where:

- `Class = 0` means legitimate
- `Class = 1` means fraud

The `V1–V28` variables are anonymized PCA-transformed components. Never invent fake semantic meanings for them.

The application should demonstrate the complete ML lifecycle:

**Dataset → EDA → preprocessing → imbalance handling → model comparison → threshold tuning → evaluation → ONNX export → browser inference → analytics dashboard → batch fraud detection → Cloudflare Pages deployment**

---

# 3. Mandatory Architecture

Use this architecture unless there is a compelling technical reason to improve it:

## Machine Learning

- Python 3
- pandas
- numpy
- scikit-learn
- imbalanced-learn
- matplotlib
- joblib
- ONNX tooling:
  - `skl2onnx`
  - `onnx`
  - `onnxruntime`
- XGBoost may be used if export is reliable in the environment.

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Recharts for dashboard visualizations
- Lucide React icons
- ONNX Runtime Web for browser inference

Use lightweight animation only where it improves polish.

Preferred animation library:

- Motion / Framer Motion

Do not create excessive animation.

## Hosting

Production frontend must work as a **static Cloudflare Pages deployment**.

Do not require:

- Flask server
- FastAPI server
- Express prediction API
- Render
- Railway
- Heroku
- always-on backend

The trained prediction model must run **inside the user's browser** using ONNX Runtime Web.

Target flow:

```text
User
  ↓
fraudshield-ai.pages.dev
  ↓
React / TypeScript application
  ↓
ONNX Runtime Web
  ↓
fraud_model.onnx
  ↓
Fraud probability + classification
```

Python is used for training, evaluation, artifact generation, and ONNX export—not for production serving.

---

# 4. Recommended Repository Structure

Create a clean monorepo-style structure similar to:

```text
fraudshield-ai/
│
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── requirements.txt
├── wrangler.toml                 # only if useful for Pages configuration
│
├── ml/
│   ├── README.md
│   ├── data/
│   │   ├── .gitkeep
│   │   └── README.md
│   ├── notebooks/
│   │   └── fraud_detection_eda.ipynb
│   ├── src/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── load_data.py
│   │   ├── eda.py
│   │   ├── preprocess.py
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   ├── threshold.py
│   │   ├── export_onnx.py
│   │   └── generate_frontend_artifacts.py
│   ├── outputs/
│   │   ├── figures/
│   │   ├── metrics/
│   │   └── models/
│   └── run_pipeline.py
│
├── public/
│   ├── models/
│   │   └── fraud_model.onnx
│   ├── data/
│   │   ├── model_metrics.json
│   │   ├── model_comparison.json
│   │   ├── feature_metadata.json
│   │   ├── dashboard_statistics.json
│   │   ├── threshold_analysis.json
│   │   └── demo_transactions.csv
│   └── favicon.svg
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    ├── pages/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── types/
    └── assets/
```

You may improve this structure, but keep ML and frontend responsibilities clearly separated.

---

# 5. Dataset Handling

Assume the user will supply the standard dataset as:

```text
ml/data/creditcard.csv
```

Do not commit the complete dataset if licensing or repository size makes that inappropriate.

Create:

```text
ml/data/README.md
```

with concise instructions explaining where `creditcard.csv` should be placed.

Validate that the dataset contains exactly the expected feature family:

```text
Time
V1 ... V28
Amount
Class
```

Handle missing or invalid data gracefully.

Display useful validation errors instead of silently failing.

---

# 6. Data Science Correctness

This project must avoid common fraud-detection mistakes.

## Mandatory rules

1. Use a **stratified train/validation/test split**.
2. Prevent data leakage.
3. Fit scalers/resampling only on training data.
4. Never apply SMOTE before splitting the complete dataset.
5. Do not use accuracy as the primary success metric.
6. Keep a final untouched test set.
7. Tune the decision threshold using validation data—not the final test set.
8. Report the chosen threshold explicitly.
9. Use reproducible random seeds.
10. Save evaluation artifacts so the frontend can display real results.

Because fraud is extremely rare, emphasize:

- Precision
- Recall
- F1-score
- PR-AUC / Average Precision
- ROC-AUC
- Confusion Matrix

Accuracy may be displayed only as a secondary metric.

---

# 7. Exploratory Data Analysis

Create a useful EDA pipeline.

Analyze and generate statistics/plots for:

- dataset shape
- class counts
- class percentages
- fraud rate
- missing values
- duplicate rows
- transaction amount distribution
- transaction time distribution
- fraud vs legitimate amount behavior
- feature distributions where useful
- feature correlations
- strongest feature correlations with `Class`
- extreme transaction amounts
- class imbalance visualization

Generate high-quality figures under:

```text
ml/outputs/figures/
```

At minimum include:

- class distribution
- amount distribution
- amount by class
- transaction-time distribution
- correlation heatmap
- confusion matrix
- ROC curve
- Precision–Recall curve
- model comparison chart
- threshold-analysis chart

Do not generate charts simply for quantity. Keep them interpretable.

---

# 8. Preprocessing

Build preprocessing through reproducible sklearn pipelines wherever appropriate.

The dataset contains PCA-transformed features `V1–V28`.

Do not unnecessarily re-apply PCA.

Treat:

- `V1–V28` as existing transformed numerical features
- `Amount` as a numerical feature that may benefit from scaling
- `Time` as numerical; test whether scaling improves the baseline

Prefer robust, leakage-safe preprocessing.

Potential preprocessing:

- StandardScaler or RobustScaler for `Amount` and optionally `Time`
- retain `V1–V28`

Document the final choice.

---

# 9. Class-Imbalance Strategy

Compare sensible imbalance approaches.

At minimum test:

### Strategy A
Class-weighted learning.

### Strategy B
SMOTE applied **only to the training folds/data**.

If SMOTE hurts generalization or precision substantially, do not force it into the final model.

Explain in the README which imbalance strategy was selected and why.

---

# 10. Models to Compare

Train at least these models:

1. **Logistic Regression**
2. **Random Forest**
3. One stronger nonlinear model, preferably:
   - XGBoost, if reliably available/exportable
   - otherwise HistGradientBoosting or another appropriate sklearn model

Use sensible class weighting where applicable.

Keep runtime reasonable for a student laptop.

Do not launch an enormous hyperparameter search.

Use a focused set of high-impact hyperparameters.

---

# 11. Model Selection Philosophy

Do not select the model only because it has the highest accuracy.

Create a comparison table containing:

- Model
- Precision
- Recall
- F1
- ROC-AUC
- PR-AUC
- False Positives
- False Negatives
- inference suitability
- ONNX export status
- approximate model size

The final browser-deployed model should balance:

- fraud-detection performance
- recall
- precision
- PR-AUC
- inference speed
- ONNX compatibility
- browser bundle/model size

If the absolute benchmark winner is too large or unreliable in ONNX, it is acceptable to have:

- **Best Benchmark Model**
- **Production/Deployed Model**

Clearly explain this distinction.

---

# 12. Decision Threshold Optimization

Do not automatically use `0.5` without analysis.

On the validation set:

- calculate precision/recall/F1 across thresholds
- generate Precision–Recall behavior
- determine a sensible threshold

Prioritize reducing dangerous false negatives while keeping false positives usable.

Create:

```text
public/data/threshold_analysis.json
```

and include:

- selected threshold
- precision at threshold
- recall at threshold
- F1 at threshold
- false-positive count
- false-negative count
- threshold curve data

The frontend must use the **actual selected threshold**.

---

# 13. Evaluation

On the untouched test set generate:

- confusion matrix
- classification report
- precision
- recall
- F1
- ROC-AUC
- PR-AUC
- accuracy
- specificity if useful
- false-positive rate
- false-negative rate

Explain why PR-AUC is particularly relevant to an imbalanced fraud problem.

Create machine-readable JSON metrics for the frontend.

Example:

```json
{
  "modelName": "Logistic Regression",
  "threshold": 0.23,
  "precision": 0.81,
  "recall": 0.88,
  "f1": 0.84,
  "rocAuc": 0.98,
  "prAuc": 0.86
}
```

These values must come from the actual trained model, not be hard-coded examples.

---

# 14. ONNX Export

Export the final deployable model to:

```text
public/models/fraud_model.onnx
```

Ensure the preprocessing required for inference is either:

1. embedded inside the ONNX graph, or
2. exactly reproduced in TypeScript from exported preprocessing metadata.

Embedding preprocessing into ONNX is preferred if reliable.

Validate ONNX predictions against the original Python model on sample test rows.

Set a tolerance and confirm probability outputs are effectively equivalent.

Create an automated validation step.

The pipeline should fail with a clear error if ONNX inference differs materially from the Python model.

---

# 15. Frontend Product Vision

The application should feel like a polished modern **fintech fraud intelligence dashboard** rather than a generic student ML project.

Brand:

```text
FraudShield AI
```

Suggested tagline:

```text
Intelligent transaction risk detection, powered by machine learning.
```

Use a clean professional light-first or balanced neutral visual language.

Avoid:

- excessive black luxury styling
- neon cyberpunk clichés
- giant gradients
- glowing cards everywhere
- random glassmorphism
- AI-generated-looking decorative clutter

Aim for:

- trustworthy
- analytical
- modern
- banking/fintech inspired
- crisp typography
- high information clarity

Use red/orange only for genuine fraud/risk states.

Use green only for safe/legitimate states.

---

# 16. Main Navigation

Suggested navigation:

```text
Overview
Analyze
Batch Scan
Model Insights
About
```

Keep the app easy to understand immediately.

---

# 17. Page 1 — Overview Dashboard

Build a polished dashboard.

Hero area:

```text
FraudShield AI
Intelligent transaction risk detection, powered by machine learning.
```

Primary CTAs:

- Analyze Transaction
- Batch Scan CSV

Display data-driven KPI cards such as:

- Total dataset transactions
- Fraud cases
- Fraud rate
- Production model
- Recall
- Precision
- PR-AUC

Values must come from generated JSON artifacts.

Include charts such as:

### Class Distribution
Legitimate vs Fraudulent.

### Transaction Amount
Distribution or amount-by-class view.

### Model Performance
Comparison of Precision / Recall / F1 / PR-AUC.

### Risk Explanation
A compact section explaining why fraud detection is an imbalanced classification problem.

Add a clear insight:

> A model can achieve extremely high accuracy by predicting almost every transaction as legitimate, which is why FraudShield AI prioritizes Precision, Recall, F1 and PR-AUC.

Use the actual dataset fraud ratio when available rather than hard-coding an approximate percentage.

---

# 18. Page 2 — Analyze Transaction

Create a single-transaction fraud analyzer.

Because the model requires 30 numerical inputs, make the UX practical.

## Main form

Display:

- Time
- Amount

Then put `V1–V28` in a clean collapsible section:

```text
Advanced anonymized features
```

Provide:

- validation
- example values
- numeric inputs
- reset button
- load safe example
- load suspicious example
- analyze button

Demo examples should be derived from actual test/sample data when the training pipeline has run.

Never fabricate feature semantics.

---

# 19. Prediction Result UI

After inference display a strong result card.

For legitimate:

```text
LEGITIMATE
Low fraud risk
```

For fraud:

```text
FRAUDULENT
High fraud risk
```

Include:

- fraud probability
- legitimate probability
- classification
- selected model threshold
- risk band
- confidence-style visualization
- short interpretation

Suggested risk bands should be derived around the model threshold, not arbitrarily imply perfect certainty.

For example:

- Low
- Moderate
- Elevated
- High

Be careful with wording.

Do not claim the system proves that a transaction is fraud.

Preferred language:

> The model estimates this transaction as high risk.

Include an educational disclaimer:

> Predictions are for demonstration and educational purposes and should not be used as the sole basis for a real financial decision.

---

# 20. Browser Inference

Create a dedicated service, for example:

```text
src/services/fraudModel.ts
```

Responsibilities:

- lazy-load ONNX Runtime Web
- load `/models/fraud_model.onnx`
- initialize session once
- convert form values into correct feature order
- use Float32Array
- run inference
- extract fraud probability
- apply exported threshold
- return typed result

Feature order must be explicit and immutable:

```text
Time,
V1,
V2,
...
V28,
Amount
```

Never accidentally reorder input values alphabetically.

Display a useful loading state while the model initializes.

Handle failures gracefully.

---

# 21. Page 3 — Batch Scan CSV

Implement client-side CSV fraud scoring.

Use a reliable browser CSV parser such as Papa Parse.

User flow:

1. upload CSV
2. validate columns
3. show row count
4. analyze transactions locally
5. show progress
6. display summary
7. display result table
8. filter by risk/classification
9. download scored CSV

Required columns:

```text
Time,V1,V2,...,V28,Amount
```

`Class` may optionally be present for comparison but must not be required for prediction.

Add prediction columns such as:

```text
FraudProbability
PredictedClass
RiskLevel
```

Support at least modest files smoothly.

Avoid blocking the UI unnecessarily.

If useful, process rows in chunks.

---

# 22. Batch Results

Display:

- total rows
- predicted fraudulent
- predicted legitimate
- fraud percentage
- highest-risk transaction
- average fraud probability

Include:

- risk histogram
- sortable result table
- risk filter
- probability filter
- pagination
- download results

Never upload the CSV to a server.

Show a privacy note:

> Analysis runs locally in your browser. Uploaded transaction data is not sent to a prediction server.

---

# 23. Page 4 — Model Insights

This page should make the academic quality obvious.

Include sections:

## The Problem

Explain credit-card fraud detection and severe class imbalance.

## Dataset

Explain:

- `Time`
- `Amount`
- `V1–V28`
- `Class`

Explicitly state that `V1–V28` are anonymized PCA components.

## Why Accuracy Is Misleading

Use the real class imbalance to explain why accuracy alone is insufficient.

## Model Comparison

Render a real comparison table.

Columns:

- Model
- Precision
- Recall
- F1
- ROC-AUC
- PR-AUC
- Selected / Benchmark status

## Confusion Matrix

Render an understandable confusion matrix.

Label:

- True Negative
- False Positive
- False Negative
- True Positive

## ROC Curve

Use generated curve data.

## Precision–Recall Curve

Use generated curve data.

## Threshold Analysis

Visualize how Precision, Recall and F1 vary with the threshold.

Mark the selected production threshold.

## Imbalance Strategy

Explain:

- class weighting
- SMOTE
- what was tested
- what was ultimately chosen

## Deployment Architecture

Show a clean architecture flow:

```text
creditcard.csv
      ↓
Python ML Pipeline
      ↓
Model Evaluation
      ↓
ONNX Export
      ↓
React Web App
      ↓
ONNX Runtime Web
      ↓
Cloudflare Pages
```

---

# 24. Page 5 — About

Include:

- project objective
- ML workflow
- technology stack
- privacy-by-design explanation
- educational disclaimer
- deployment architecture

Add a section explaining:

> FraudShield AI performs inference locally in the browser. The production application does not require transaction data to be sent to a remote prediction server.

Do not claim regulatory compliance.

---

# 25. Frontend Components

Create reusable components rather than one giant file.

Possible components:

```text
Navbar
MobileNav
PageHeader
MetricCard
RiskBadge
PredictionGauge
TransactionForm
FeatureInputGrid
UploadDropzone
BatchSummary
BatchResultsTable
ModelComparisonChart
ClassDistributionChart
AmountDistributionChart
ConfusionMatrix
ROCCurveChart
PrecisionRecallChart
ThresholdChart
ArchitectureDiagram
InfoCallout
LoadingModel
EmptyState
Footer
```

Use appropriate composition and naming.

---

# 26. Design System

Use Tailwind consistently.

Suggested design direction:

- warm white / very light gray canvas
- deep navy/slate text
- subtle borders
- restrained shadows
- large whitespace
- medium-radius cards
- clear typography hierarchy
- professional data visualization

Avoid oversaturating the entire interface.

Risk colors:

- green = legitimate / low
- amber = elevated
- orange = high
- red = likely fraud

Ensure WCAG-friendly contrast.

---

# 27. Responsive Design

The application must work well on:

- desktop
- laptop
- tablet
- mobile

On small screens:

- cards stack cleanly
- charts remain readable
- wide tables become horizontally scrollable or compact
- navigation collapses
- form inputs remain usable

Test around:

```text
320px
375px
768px
1024px
1440px
```

---

# 28. UX Requirements

Implement:

- skeleton/loading states
- model loading indicator
- disabled analyze button while loading
- helpful validation messages
- drag-and-drop CSV upload
- keyboard accessibility
- labels for inputs
- tooltips for ML terminology
- empty states
- error states
- success states
- reset actions

Do not use native browser alerts for normal UX.

---

# 29. Frontend Data Artifacts

The Python pipeline should generate frontend-ready JSON.

Create data such as:

```text
public/data/model_metrics.json
public/data/model_comparison.json
public/data/dashboard_statistics.json
public/data/roc_curve.json
public/data/pr_curve.json
public/data/threshold_analysis.json
public/data/confusion_matrix.json
public/data/feature_metadata.json
public/data/demo_transactions.json
```

Do not hard-code model-performance numbers inside React components.

If the ML pipeline has not yet been run, the frontend should fail gracefully or use clearly labeled development/demo fallback data.

Never present fallback numbers as real trained results.

---

# 30. Demo Transactions

Generate examples from the test set after training.

Create at least:

- one legitimate example
- one fraudulent example
- several rows for demo batch analysis

Do not leak test labels into the inference algorithm.

The label may be stored separately for demonstration/validation.

Provide buttons:

```text
Load Legitimate Example
Load Fraud Example
```

This makes the deployed project easy to demonstrate.

---

# 31. Explainability

Because the PCA features are anonymized, do not make misleading feature explanations.

If feature importance is shown:

- call it model feature importance
- display feature names only
- do not invent real-world meanings

For linear models, coefficient magnitude may be shown.

For tree models, use native importance if appropriate.

Explain that feature importance indicates model influence, not causal interpretation.

---

# 32. Performance

Optimize for Cloudflare Pages.

Requirements:

- lazy-load large libraries where sensible
- lazy-load ONNX model when needed or preload intelligently
- code-split routes if beneficial
- minimize unnecessary dependencies
- keep the ONNX model reasonably small
- avoid huge unoptimized images
- use SVG/icons rather than heavy decorative assets
- run production build and inspect bundle warnings

If the benchmark model produces an impractically large ONNX model, choose a compact deployable model and document the tradeoff.

---

# 33. Security and Privacy

This is an educational ML application.

Requirements:

- no real card numbers
- no CVV
- no names
- no bank login information
- no API secrets in frontend code
- no transaction upload to a backend
- no analytics that captures uploaded CSV contents
- client-side processing only

Add clear disclaimer wording.

Do not call the application bank-grade, certified, guaranteed, or production-compliant.

---

# 34. Testing

Implement useful tests.

## Python

Test:

- dataset schema validation
- feature order
- preprocessing output
- probability shape
- threshold application
- model artifact creation
- ONNX parity with Python model

## Frontend

At minimum verify:

- model service feature order
- risk classification
- CSV schema validation
- malformed row handling
- probability formatting

Use Vitest if practical.

---

# 35. Developer Commands

Provide clear commands.

The intended workflow should be roughly:

## Python setup

```bash
python -m venv .venv
```

Activate it appropriately.

```bash
pip install -r requirements.txt
```

Place dataset:

```text
ml/data/creditcard.csv
```

Run full ML pipeline:

```bash
python ml/run_pipeline.py
```

This should:

1. validate data
2. perform EDA
3. split data
4. train candidate models
5. evaluate them
6. tune threshold
7. choose deployment model
8. export ONNX
9. validate ONNX parity
10. generate frontend JSON artifacts
11. generate demo transactions

## Frontend

```bash
npm install
npm run dev
npm run build
npm run preview
```

The project must build successfully.

---

# 36. Cloudflare Pages Deployment

Prepare the project specifically for:

```text
fraudshield-ai.pages.dev
```

Use:

```text
Build command:
npm run build

Build output directory:
dist
```

Ensure SPA routing works correctly on Cloudflare Pages.

Add whatever redirect/fallback configuration is necessary for React Router.

For example, use an appropriate `_redirects` strategy if required.

Ensure assets such as:

```text
/models/fraud_model.onnx
/data/*.json
```

are available after build.

Do not reference local filesystem paths from production frontend code.

Use root-relative or Vite-safe URLs.

---

# 37. Cloudflare Configuration

If helpful, create minimal Cloudflare files such as:

```text
public/_headers
public/_redirects
```

Possible goals:

- SPA fallback
- sensible caching for static assets
- ONNX model caching
- security-related response headers

Do not add Cloudflare Workers unless necessary.

The target should remain a simple Pages deployment.

---

# 38. README

Create an excellent root `README.md`.

Include:

1. FraudShield AI title
2. short overview
3. project screenshot placeholder
4. live demo URL:
   `https://fraudshield-ai.pages.dev`
5. problem statement
6. dataset description
7. architecture
8. ML pipeline
9. imbalance problem
10. models compared
11. evaluation metrics
12. model selection
13. threshold tuning
14. ONNX browser inference
15. frontend features
16. batch CSV prediction
17. technology stack
18. folder structure
19. local setup
20. training instructions
21. frontend commands
22. deployment instructions
23. privacy notes
24. limitations
25. future improvements

Make the README strong enough for a GitHub portfolio project.

---

# 39. Academic Explanation

Add concise educational explanations throughout the project.

Explain concepts in accessible language:

### Precision

> Of the transactions predicted as fraud, how many were actually fraud?

### Recall

> Of all actual fraudulent transactions, how many did the model detect?

### F1 Score

> A balance between Precision and Recall.

### ROC-AUC

> Measures ranking performance across many classification thresholds.

### PR-AUC

> Especially useful when the positive class—fraud—is rare.

Make these available through tooltips or explanatory cards.

---

# 40. Avoid Misleading Claims

Never say:

- "100% fraud detection"
- "bank-grade security"
- "guaranteed fraud prevention"
- "real-time bank fraud protection"
- "AI knows why the card was stolen"

Use accurate wording such as:

- predicted fraud risk
- model-estimated probability
- classification
- high-risk transaction
- educational fraud-detection model

---

# 41. Suggested Home Page Copy

Use polished copy similar to:

### Hero

**Detect suspicious transactions before they disappear into the noise.**

FraudShield AI uses machine learning to estimate credit-card transaction fraud risk directly in your browser.

CTA:

```text
Analyze Transaction
Explore Model
```

### Privacy Callout

**Local by design**

Transaction analysis runs inside the browser using an ONNX machine-learning model. No prediction server is required.

### Imbalance Insight

**Why 99% accuracy can still be a bad fraud detector**

Fraud cases make up only a tiny fraction of the dataset. FraudShield AI therefore emphasizes Recall, Precision, F1 and PR-AUC rather than relying on accuracy alone.

Use actual trained statistics once they exist.

---

# 42. Optional Premium Features

Implement these only if they do not compromise stability.

## A. Risk gauge

A clean semicircular or horizontal risk visualization.

## B. Downloadable batch report

Allow CSV export of scored transactions.

## C. Model confidence distribution

Visualize batch probabilities.

## D. Model architecture card

Show:

```text
30 Input Features
→ Preprocessing
→ ML Classifier
→ Fraud Probability
→ Tuned Threshold
→ Risk Classification
```

## E. Theme

Light theme is primary.

A dark mode is optional, not required.

---

# 43. Model Pipeline Implementation Details

Use deterministic configuration.

Centralize values in:

```text
ml/src/config.py
```

Include items such as:

- random seed
- paths
- test size
- validation size
- target column
- feature order
- threshold objective

Avoid duplicating feature order across arbitrary files.

Export the canonical feature order to frontend metadata.

---

# 44. Artifact Contract Between Python and React

Create a stable machine-readable contract.

Example `feature_metadata.json`:

```json
{
  "features": [
    "Time",
    "V1",
    "V2",
    "V3",
    "V4",
    "V5",
    "V6",
    "V7",
    "V8",
    "V9",
    "V10",
    "V11",
    "V12",
    "V13",
    "V14",
    "V15",
    "V16",
    "V17",
    "V18",
    "V19",
    "V20",
    "V21",
    "V22",
    "V23",
    "V24",
    "V25",
    "V26",
    "V27",
    "V28",
    "Amount"
  ],
  "target": "Class"
}
```

React inference must verify the model metadata before scoring.

---

# 45. ML Pipeline Logging

When running:

```bash
python ml/run_pipeline.py
```

print readable progress such as:

```text
[1/10] Loading dataset
[2/10] Validating schema
[3/10] Creating train/validation/test split
[4/10] Training Logistic Regression
[5/10] Training Random Forest
[6/10] Training Gradient Boosting
[7/10] Comparing models
[8/10] Optimizing threshold
[9/10] Exporting ONNX
[10/10] Generating frontend artifacts

FraudShield AI pipeline completed successfully.
```

Do not spam the terminal with unnecessary logs.

---

# 46. Error Handling

Handle:

- missing dataset
- wrong filename
- missing columns
- non-numeric values
- model export errors
- malformed CSV
- ONNX load failure
- missing JSON analytics
- unsupported browser inference
- invalid transaction values

Messages should tell the developer or user how to fix the issue.

---

# 47. Build Validation

Before considering the project complete, actually run the relevant checks.

At minimum:

```bash
npm install
npm run build
```

If dataset is available:

```bash
pip install -r requirements.txt
python ml/run_pipeline.py
```

Then rerun:

```bash
npm run build
```

Resolve errors.

Do not state that deployment is ready if the production build fails.

---

# 48. Code Quality

Requirements:

- TypeScript strictness where reasonable
- no `any` everywhere
- descriptive names
- modular code
- reusable components
- centralized constants
- comments only where valuable
- no dead code
- no duplicated data definitions
- no giant 1000-line component
- no console spam in production
- no hardcoded fake metrics

---

# 49. Git Hygiene

Create an appropriate `.gitignore`.

Ignore:

- Python virtual environment
- Python cache
- node_modules
- dist
- temporary outputs
- local environment files
- full dataset if appropriate

Do not ignore required generated production artifacts such as the final ONNX model if they are intended to be deployed from the repository.

---

# 50. Final Acceptance Criteria

The project is complete only when all applicable statements are true:

- [ ] React application launches.
- [ ] Production build succeeds.
- [ ] Design looks polished and intentional.
- [ ] Mobile layout works.
- [ ] `creditcard.csv` schema is validated.
- [ ] Train/validation/test split is stratified.
- [ ] Data leakage is prevented.
- [ ] Logistic Regression is evaluated.
- [ ] Random Forest is evaluated.
- [ ] At least one stronger nonlinear model is evaluated.
- [ ] Class imbalance is handled correctly.
- [ ] Accuracy is not the primary metric.
- [ ] Precision is reported.
- [ ] Recall is reported.
- [ ] F1 is reported.
- [ ] ROC-AUC is reported.
- [ ] PR-AUC is reported.
- [ ] Threshold tuning is implemented.
- [ ] Final test set remains untouched until final evaluation.
- [ ] Production model is exported to ONNX.
- [ ] ONNX predictions are validated against Python.
- [ ] Browser inference works.
- [ ] Single transaction analysis works.
- [ ] Batch CSV scoring works.
- [ ] Batch results can be downloaded.
- [ ] Dashboard uses real generated metrics.
- [ ] Confusion matrix works.
- [ ] ROC visualization works.
- [ ] Precision–Recall visualization works.
- [ ] Threshold visualization works.
- [ ] Model comparison works.
- [ ] `V1–V28` are described accurately.
- [ ] No fake business meanings are assigned to PCA features.
- [ ] No card details are collected.
- [ ] Privacy message is accurate.
- [ ] README is complete.
- [ ] Cloudflare Pages configuration is ready.
- [ ] SPA navigation works after deployment.
- [ ] Target URL is documented as `fraudshield-ai.pages.dev`.

---

# 51. Execution Order

Follow this sequence.

## Phase 1 — Inspect

Inspect the current repository.

Determine:

- existing files
- whether the dataset is present
- available Python environment
- available Node environment

Do not delete useful existing work.

## Phase 2 — Scaffold

Create the complete clean project structure.

## Phase 3 — ML Pipeline

Implement:

- loading
- validation
- EDA
- preprocessing
- splitting
- training
- model comparison
- imbalance strategy
- threshold tuning
- evaluation
- ONNX export
- ONNX parity check
- frontend JSON artifact generation

## Phase 4 — Frontend

Build:

- Overview
- Analyze
- Batch Scan
- Model Insights
- About

## Phase 5 — Integration

Connect:

- ONNX model
- metrics JSON
- dashboard statistics
- demo transactions
- batch scoring

## Phase 6 — Polish

Improve:

- spacing
- typography
- responsive layout
- states
- accessibility
- charts
- error handling

## Phase 7 — Validation

Run:

- ML checks if dataset is available
- frontend tests
- production build

Fix all errors.

## Phase 8 — Documentation

Finalize README and deployment instructions.

---

# 52. Important Behavior When Dataset Is Missing

If `ml/data/creditcard.csv` is not present:

Do **not** block the entire build.

Still build:

- complete ML source code
- complete frontend
- CSV upload
- model loading service
- analytics UI
- documentation
- scripts

Create a clear developer state explaining that:

```text
The ML pipeline has not yet generated production artifacts.
Place creditcard.csv in ml/data/ and run:
python ml/run_pipeline.py
```

However:

- do not invent final model performance
- do not label fake metrics as real
- do not create a fake production ONNX model
- do not pretend predictions work until a valid model has been generated

The repository should be ready for the dataset to be added and pipeline run once.

---

# 53. Final Handoff

At completion, provide a concise terminal summary containing:

```text
FraudShield AI — Build Complete

Frontend:
- Framework:
- Production build:
- Main routes:

Machine Learning:
- Dataset status:
- Models implemented:
- Final deployed model:
- Threshold:
- ONNX path:

Cloudflare Pages:
- Build command: npm run build
- Output directory: dist
- Target: fraudshield-ai.pages.dev

Next command(s):
...
```

If the dataset was available, include real model metrics.

If it was not available, clearly state that training still needs to be run.

---

# 54. Final Principle

This should look and behave like a project created by someone who understands both:

1. **machine-learning correctness**, and
2. **real product engineering**.

Do not optimize only for visual appearance.

Do not optimize only for an ML notebook.

The final result must combine:

**correct ML + explainability + excellent UI + browser inference + reproducible pipeline + simple deployment.**

Build the project completely.
