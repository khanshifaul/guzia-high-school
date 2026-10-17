// prisma.config.ts — Prisma 7 config (copied from zylosync): connection URLs
// live here, not in the schema file. Loads .env.local for local development.
import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

config({ path: resolve(__dirname, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
