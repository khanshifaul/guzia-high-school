# 07 — AI Feature: At-Risk Student Early-Warning Classifier

**One practical ML feature** (assessment requirement). Self-built, fully explainable,
trained and evaluated offline; inference served by the API. No external API keys —
reviewers can retrain and tweak live. Teacher-facing AI (plans/tests/sources on an
admin-configured OpenAI-compatible provider) is a separate spec: **specs/10**.

## Problem & value

Teachers discover failing students at results time. The classifier flags at-risk
students **continuously** from data the school already records, so admin can intervene
mid-term. It is a triage assistant, not an oracle — a human decides what to do.

## Approach

Binary classification: `atRisk ∈ {0,1}` per enrolled student.
**Model: logistic regression** implemented from scratch in TypeScript
(`apps/api/src/ai/model.ts`) — gradient descent, no deps.

Why this model (say this in the live review):
- Fully explainable: prediction = σ(Σ wᵢxᵢ + b); per-student factor contributions
  `wᵢxᵢ` are displayed on the admin board (the "AI explanation" the rubric wants).
- Trains in <1s on hundreds of rows; reproducible offline (`bun run ai:train`).
- Honest limitations are discussable: linear decision boundary, feature engineering
  does the heavy lifting, needs real outcome labels to generalize.

## Features (all 0–1 normalized, computed server-side per student)

| # | Feature | Definition | Source |
|---|---|---|---|
| 1 | `attendanceRate` | weighted pct (same formula as app: (P+0.5L)/total) over last **60 school days**, /100 | AttendanceRecord |
| 2 | `lateRate` | LATE / total over same window | AttendanceRecord |
| 3 | `gpaTrend` | slope of exam GPAs over last ≥2 published exams, mapped `1 / (1 + e^(−slope·2))` (flat→0.5, improving→→1, declining→→0) | ExamMark→GPA |
| 4 | `submissionRate` | on-time graded submissions / assignments due in last 60 days (no due work → 0.5 neutral) | Submission, Assignment |
| 5 | `overdueFeeRatio` | overdue amount / total invoiced, capped 1 (no invoices → 0) | Invoice, PaymentAllocation |

Input vector per student: `[attendanceRate, 1−lateRate, gpaTrend, submissionRate, 1−overdueFeeRatio]`
(all "higher = safer" orientation). Students with <30 attendance records or <1 exam
get scored but flagged `insufficientData` in factors JSON (thresholds in model file).

## Label generation (training data)

No historical outcome labels exist in a demo DB, so `train.ts` generates a labeled
synthetic cohort **with the same deterministic RNG as the seed** (seeded, documented):

- 400 synthetic students: features sampled from Beta-like distributions (mostly
  healthy, 15–20% weak — mirrors the seeded class).
- Ground-truth label via a **noisy hand-written rule** (not the model's own linear
  form): `atRisk = (attendance<0.75 || gpaTrend<0.35 || (submission<0.5 && attendance<0.85))`
  with 8% label flips (simulated human/labeling error).
- 80/20 train/holdout split (deterministic).

This is stated plainly in the README: *"trained on synthetic labeled data derived from
domain rules with injected noise; it demonstrates the full ML pipeline (data → train →
evaluate → serve → explain). With real historical pass/fail outcomes it would be
retrained on those instead."* That honesty is exactly what the rubric's
"explain limitations / evaluation" asks for.

## Model file (`src/ai/model/at-risk-model.json`, committed)

```json
{
  "version": 1,
  "trainedAt": "ISO", "seed": 42, "samples": 400, "holdout": 80,
  "features": ["attendanceRate","invLateRate","gpaTrend","submissionRate","invOverdueFee"],
  "weights": [-2.9, -1.1, -2.2, -1.6, -0.7],
  "bias": 2.4,
  "threshold": 0.5,
  "standardize": {"mean": [...], "std": [...]},
  "metrics": {"holdoutAccuracy": 0.93, "precision": 0.88, "recall": 0.90, "f1": 0.89, "auc": 0.96}
}
```
(Exact numbers replaced by actuals from `bun run ai:train` output; file is the artifact.)

## Training (`apps/api/src/ai/train.ts`, script `bun run ai:train`)

1. Generate cohort (above) → standardize features (mean/std stored in model).
2. Logistic regression: 2000 epochs full-batch GD, lr 0.1, L2 λ=0.001.
3. Evaluate on holdout: accuracy, precision, recall, F1, ROC-AUC (own implementation).
4. Write model JSON + `test-reports/ai-eval-report.md` (metrics table, confusion
   matrix, feature-weight interpretation, limitations).

## Inference & serving

- `AtRiskService.recompute()` (POST `/api/ai/at-risk/recompute`, ADMIN): for each
  ACTIVE student with linked user → extract features from DB → standardize → σ(w·x+b)
  → upsert `AtRiskScore` `{score, atRisk: score≥threshold, factors}`.
- `factors` JSON: top-3 contributions sorted by |wᵢ·(xᵢ−meanᵢ)/stdᵢ|, each
  `{feature, value, contribution, direction}` — powers the admin "why" chips.
- GET `/api/ai/at-risk` → board data. Recompute is also exposed as an admin button;
  typical run: <2s for the demo dataset.
- Batch scoring, not per-request: risk is a daily-ish batch metric (stated in model card).

## Evaluation story for the review (say this)

- **Inputs:** 5 engineered features from attendance/marks/submissions/fees (table above).
- **Outputs:** probability 0–1, boolean flag at threshold 0.5, top-3 contributing
  factors with direction.
- **Evaluation:** holdout metrics in model JSON + committed report; confusion matrix
  discussion (precision vs recall tradeoff — for intervention, recall matters more:
  missing a real at-risk student costs more than a false alarm; threshold is a stored
  knob, admin can request re-score at 0.4).
- **Limitations:** synthetic labels (circularity risk — the model can at best recover
  the rule + noise robustly); linear boundary; features ignore family context,
  health, extracurriculars; drifts as school behavior changes (retrain per term);
  not a diagnostic tool; sensitive to data quality (unmarked attendance skews rates).
- **Usefulness check:** qualitative — the seeded class contains 3 deliberately weak
  students (poor attendance + missing submissions + falling GPA); the board must flag
  all 3 in HIGH/MEDIUM. This is demonstrated in the live demo, not claimed.

## Web UI

`admin/at-risk` (specs/06): model card (version, trainedAt, threshold, metrics),
Recompute button, table sorted by score: student, class, score bar, HIGH/MEDIUM/LOW
badge, top-3 factor chips (`attendance ↓0.31` style). Empty state until first recompute.

## Out of scope (post-assessment)

Real outcome labels (exam pass/fail history), per-feature drift monitoring, threshold
UI, per-class models, SHAP-level explanations, LSTM on sequences — all mentioned in
README "Future work" only.
