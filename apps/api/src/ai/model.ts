// src/ai/model.ts — logistic regression learned from scratch (specs/07).
// No ML deps: gradient descent on the sigmoid. Fully explainable — the
// prediction is σ(w·x + b) and each feature's contribution is wᵢ·(xᵢ−meanᵢ)/stdᵢ.

export interface TrainedModel {
    version: number;
    trainedAt: string;
    seed: number;
    samples: number;
    holdout: number;
    features: string[];
    weights: number[];
    bias: number;
    threshold: number;
    standardize: { mean: number[]; std: number[] };
    metrics: {
        holdoutAccuracy: number;
        precision: number;
        recall: number;
        f1: number;
        auc: number;
    };
}

function sigmoid(z: number): number {
    // Clamp to avoid overflow in exp for extreme logits.
    const clamped = Math.max(-500, Math.min(500, z));
    return 1 / (1 + Math.exp(-clamped));
}

/** Deterministic PRNG (mulberry32) so training is reproducible. */
export function rng(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface StandardizeStats {
    mean: number[];
    std: number[];
}

/** Compute per-feature mean/std for standardization (population std). */
export function computeStats(X: number[][]): StandardizeStats {
    const n = X.length;
    const dims = X[0]?.length ?? 0;
    const mean = Array.from({ length: dims }, (_, d) =>
        X.reduce((s, row) => s + row[d], 0) / n,
    );
    const std = Array.from({ length: dims }, (_, d) => {
        const variance = X.reduce((s, row) => s + (row[d] - mean[d]) ** 2, 0) / n;
        return Math.sqrt(variance) || 1; // avoid divide-by-zero for constant features
    });
    return { mean, std };
}

export function standardize(X: number[][], stats: StandardizeStats): number[][] {
    return X.map((row) => row.map((v, d) => (v - stats.mean[d]) / stats.std[d]));
}

/**
 * Train logistic regression with full-batch gradient descent + L2.
 * Returns the trained model (weights are in standardized-feature space).
 */
export function trainLogisticRegression(opts: {
    X: number[][];
    y: number[];
    features: string[];
    seed?: number;
    epochs?: number;
    learningRate?: number;
    l2?: number;
    threshold?: number;
}): TrainedModel {
    const { X, y, features } = opts;
    const seed = opts.seed ?? 42;
    const epochs = opts.epochs ?? 2000;
    const lr = opts.learningRate ?? 0.1;
    const l2 = opts.l2 ?? 0.001;
    const threshold = opts.threshold ?? 0.5;

    const stats = computeStats(X);
    const Xs = standardize(X, stats);
    const n = Xs.length;
    const dims = Xs[0]?.length ?? 0;

    let weights = Array.from({ length: dims }, () => 0);
    let bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
        // Full-batch gradients.
        const gradW = Array.from({ length: dims }, () => 0);
        let gradB = 0;
        for (let i = 0; i < n; i++) {
            const z = weights.reduce((s, w, d) => s + w * Xs[i][d], bias);
            const err = sigmoid(z) - y[i];
            for (let d = 0; d < dims; d++) gradW[d] += err * Xs[i][d];
            gradB += err;
        }
        for (let d = 0; d < dims; d++) {
            weights[d] -= lr * (gradW[d] / n + l2 * weights[d]);
        }
        bias -= lr * (gradB / n);
    }

    return {
        version: 1,
        trainedAt: new Date().toISOString(),
        seed,
        samples: n,
        holdout: 0,
        features,
        weights,
        bias,
        threshold,
        standardize: stats,
        metrics: { holdoutAccuracy: 0, precision: 0, recall: 0, f1: 0, auc: 0 },
    };
}

/** Predict probability for one standardized-space feature vector. */
export function predictProbability(model: TrainedModel, xRaw: number[]): number {
    const x = xRaw.map((v, d) => (v - model.standardize.mean[d]) / model.standardize.std[d]);
    const z = model.weights.reduce((s, w, d) => s + w * x[d], model.bias);
    return sigmoid(z);
}

/**
 * Per-feature contributions for the "why" explanation. Returns the top-k
 * features by |contribution|, where contribution = wᵢ·(standardized xᵢ).
 */
export function featureContributions(
    model: TrainedModel,
    xRaw: number[],
    topK = 3,
): { feature: string; value: number; contribution: number; direction: "risk" | "safe" }[] {
    const x = xRaw.map((v, d) => (v - model.standardize.mean[d]) / model.standardize.std[d]);
    const scored = model.weights.map((w, d) => ({
        feature: model.features[d],
        value: xRaw[d],
        contribution: w * x[d],
        // Positive contribution → pushes toward at-risk (σ↑).
        direction: (w * x[d] > 0 ? "risk" : "safe") as "risk" | "safe",
    }));
    return scored
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, topK);
}

/** Evaluate accuracy/precision/recall/F1/AUC on a labeled holdout set. */
export function evaluate(
    model: TrainedModel,
    X: number[][],
    y: number[],
): TrainedModel["metrics"] {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    const probs: { p: number; label: number }[] = [];

    for (let i = 0; i < X.length; i++) {
        const p = predictProbability(model, X[i]);
        const pred = p >= model.threshold ? 1 : 0;
        probs.push({ p, label: y[i] });
        if (pred === 1 && y[i] === 1) tp++;
        else if (pred === 1 && y[i] === 0) fp++;
        else if (pred === 0 && y[i] === 1) fn++;
        else tn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn || 1);
    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    const f1 = (2 * precision * recall) / (precision + recall || 1);
    const auc = computeAuc(probs);

    return {
        holdoutAccuracy: round3(accuracy),
        precision: round3(precision),
        recall: round3(recall),
        f1: round3(f1),
        auc: round3(auc),
    };
}

/** ROC-AUC via the rank method (Mann-Whitney U). */
function computeAuc(probs: { p: number; label: number }[]): number {
    const positives = probs.filter((x) => x.label === 1).map((x) => x.p);
    const negatives = probs.filter((x) => x.label === 0).map((x) => x.p);
    if (positives.length === 0 || negatives.length === 0) return 0.5;
    let wins = 0;
    for (const pos of positives) {
        for (const neg of negatives) {
            if (pos > neg) wins += 1;
            else if (pos === neg) wins += 0.5;
        }
    }
    return wins / (positives.length * negatives.length);
}

function round3(v: number): number {
    return Math.round(v * 1000) / 1000;
}
