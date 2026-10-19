// src/config/validation.schema.ts — adapted from zylosync for guzia-high-school.
import * as Joi from 'joi';

// Optional string helper: treats an empty string (`"`) as "not set".
// (Copied rationale from zylosync: secret managers inject `''` rather than
// absent vars; Joi rejects empty strings by default and crashes the boot.)
const optionalStr = () => Joi.string().empty('');

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  AI_CONFIG_SECRET: Joi.string().min(16).required(),
  PORT: Joi.number().default(4000),

  // AI provider boot-seed defaults (runtime truth = AiProviderConfig row).
  AI_PROVIDER: Joi.string().valid('deepseek', 'mock').default('mock'),
  DEEPSEEK_API_KEY: optionalStr(),
  DEEPSEEK_BASE_URL: Joi.string()
    .uri()
    .default('https://api.deepseek.com/v1'),
  DEEPSEEK_MODEL: optionalStr().default('deepseek-chat'),
  GEMINI_API_KEY: optionalStr(),

  // Embeddings: local (384-d) is the default; nvidia needs a 2048-d column.
  EMBEDDINGS_PROVIDER: Joi.string().valid('local', 'nvidia').default('local'),
  NVIDIA_API_KEY: optionalStr(),
  NVIDIA_BASE_URL: Joi.string().uri().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_EMBED_MODEL: optionalStr().default('nvidia/nemotron-3-embed-1b'),

  // Scanned-PDF OCR (optional system binaries; see ai/sources/ocr.util.ts).
  PDFTOPPM_BIN: optionalStr().default('pdftoppm'),
  TESSERACT_BIN: optionalStr().default('tesseract'),
  OCR_DPI: Joi.number().integer().min(72).max(400).default(200),
  OCR_LANGS: optionalStr().default('eng'),
}).unknown(true);
