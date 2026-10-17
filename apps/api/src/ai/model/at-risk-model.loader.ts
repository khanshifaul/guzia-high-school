// src/ai/model/at-risk-model.loader.ts — exposes the committed model JSON
// (written by `bun run ai:train`). Static-imported so tsc bundles it into dist
// and no runtime path resolution is needed. Weights/metrics are the source of
// truth for scoring.
import type { TrainedModel } from '../model';
import modelJson from './at-risk-model.json';

const model = modelJson as TrainedModel;

export function loadTrainedModel(): TrainedModel {
    return model;
}
