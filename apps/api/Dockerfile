# apps/api/Dockerfile — the NestJS API for Render (or any Docker host).
#
# poppler + tesseract are installed so scanned PDFs can be transcribed; every
# other AI feature works offline with the mock provider. The image keeps the
# dev dependencies because `prisma migrate deploy` / `prisma db seed` are run
# from this image by the deploy hook.
FROM oven/bun:1.4-debian AS build

WORKDIR /app

# Install only the API workspace. The lockfile is shared with the web app, but
# the web app is not part of this image.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
RUN bun install --frozen-lockfile

COPY apps/api apps/api

WORKDIR /app/apps/api
RUN bun run build

FROM oven/bun:1.4-debian AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    poppler-utils tesseract-ocr tesseract-ocr-eng ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 4000

# `node` here is Bun's Node-compatible runtime; the compiled dist is CommonJS.
CMD ["bun", "dist/src/main.js"]
