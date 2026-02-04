# JobTracker SaaS

Monorepo for the JobTracker SaaS (admin panel, API, agent, and browser extension).

## Apps
- `apps/web` - Next.js admin panel
- `apps/api` - NestJS API
- `apps/agent` - Electron agent
- `apps/extension` - Browser extension (URL bridge)
- `packages/shared` - Shared types

## Getting started

```bash
npm install
```

### API

```bash
copy apps/api/.env.example apps/api/.env
npm run prisma:generate -w @jobtracker/api
npm run prisma:migrate -w @jobtracker/api
npm run dev -w @jobtracker/api
```

### Web

```bash
copy apps/web/.env.local.example apps/web/.env.local
npm run dev -w @jobtracker/web
```

### Agent (Electron)

```bash
npm run dev -w @jobtracker/agent
```

### Extensión (URL Bridge)

1. Abre `chrome://extensions`.
2. Activa el modo desarrollador.
3. Carga la carpeta `apps/extension`.

### Build del agente

```bash
npm run dist -w @jobtracker/agent
```

### Purga de capturas

```bash
npm run purge:screenshots -w @jobtracker/api
```

### Docker (API + Web + Postgres)

```bash
docker compose up --build
```

## Releases del agente (auto-update)

- Crea un tag `vX.Y.Z` y haz push.
- GitHub Actions compila y publica release.
- Define el secreto `GH_TOKEN` en el repo.

The API defaults to `http://localhost:4000`.
The web app defaults to `http://localhost:3000`.
