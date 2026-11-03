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

# Typst is the PDF renderer for Bengali papers. Pinned 0.15.1 static musl
# build, verified by sha256 before it is unpacked. Both faces the renderer
# names — Liberation Serif (Latin) and Noto Sans Bengali (Bengali) — are
# vendored under apps/api/assets/fonts.
ARG TYPST_VERSION=0.15.1
ARG TYPST_SHA256=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    poppler-utils tesseract-ocr tesseract-ocr-eng ca-certificates fonts-liberation curl xz-utils \
  && curl -fsSL -o /tmp/typst.tar.xz \
    "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" \
  && echo "${TYPST_SHA256}  /tmp/typst.tar.xz" | sha256sum -c - \
  && tar -xJf /tmp/typst.tar.xz -C /usr/local/bin --strip-components=1 \
    typst-x86_64-unknown-linux-musl/typst \
  && rm /tmp/typst.tar.xz \
  && rm -rf /var/lib/apt/lists/*

ENV TYPST_BIN=/usr/local/bin/typst

WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/node_modules ./node_modules
# Bun installs the API workspace's dependencies under apps/api/node_modules
# (only that workspace is present in the build context).
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# Bun resolves the `prisma/generated/*` path alias from tsconfig at runtime.
COPY --from=build /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
# Vendored renderer fonts (EXPORT_FONT_PATH defaults to this dir relative to
# the app's cwd, /app/apps/api).
COPY --from=build /app/apps/api/assets ./apps/api/assets

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 4000

# `node` here is Bun's Node-compatible runtime; the compiled dist is CommonJS.
CMD ["bun", "dist/src/main.js"]
