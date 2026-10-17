# infrastructure/

Deploy & runtime assets for guzia-high-school. Mirrors the zylosync
`infrastructure/` layout, sized for a two-app project.

```
infrastructure/
├── docker/          # daemon config + notes
│   └── daemon.json
├── postgres/        # DB bootstrap / backup helpers
│   └── backup.sh
└── README.md        # this file
```

## Notes

- **Local dev** uses `docker-compose.yml` at the repo root (Postgres 18 on :5434).
  `scripts/bootstrap.sh` brings it up.
- **Container deploys** build each app's `Dockerfile` (`node:20-alpine`, multi-stage).
  The API runs `prisma migrate deploy` on start; the web app serves the portal.
- There is **no k8s/ overlay** by design — this is a single-school app, not a
  multi-tenant platform. If you add a cluster later, follow the zylosync kustomize
  layout (`infrastructure/k8s/{base,overlays}`).

## Ports

| Service | Port |
|---|---|
| Postgres | 5434 (host) → 5432 (container) |
| API | 4000 |
| Web | 3004 |
