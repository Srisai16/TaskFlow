# TaskFlow — Deployment Guide

> Repo: `https://github.com/Srisai16/TaskFlow` (monorepo: `backend/` + `frontend/`)

## What is deployable right now (this commit)
- **Backend** (Render, free tier): Spring Boot 3.4 / Java 23 via **multi-stage Dockerfile** (`backend/Dockerfile`), served on the port **Render injects via `PORT`** (env override: `server.port: ${PORT:8080}`).
- **Database**: **H2 in-memory** (default, `jdbc:h2:mem:taskflow`, seeds demo accounts + sample data at boot). For persistence swap to **Render Postgres** (blueprint `render.yaml` provisions it) by setting:
  ```env
  DB_URL=jdbc:postgresql://<host>:5432/taskflow?sslmode=require
  DB_USERNAME=taskflow
  DB_PASSWORD=<from-render>
  ```
- **Frontend** (Vercel free): React 18 + Vite SPA. `vercel.json` sets SPA rewrites + `dist` output. Set `VITE_API_BASE_URL=https://<your-api>.onrender.com/api` so the app calls Render instead of `/api`. (Vite dev proxy still used locally; the client falls back to `/api` without the env var.)

## Automated step-by-step

### 1. Push the monorepo to GitHub
```bash
git init -b main
git add -A
git commit -m "TaskFlow: full-stack task manager (Spring Boot 3.4 + React 18 + JWT)"
git branch -M main
git remote add origin https://github.com/Srisai16/TaskFlow.git
git push -u origin main
```
`render.yaml`, `vercel.json`, `DEPLOYMENT.md`, Dockerfiles, env examples are all committed — this repo is **deploy-ready on import**.

### 2. Backend → Render (Blueprint deploy, includes Postgres)
1. On render.com: **New → Blueprint** → connect GitHub → select the **TaskFlow** repo.
2. Render reads `render.yaml` and creates **two** resources automatically:
   - `taskflow-db` (PostgreSQL, free)
   - `taskflow-api` (Docker, `rootDir: backend`)
3. Add env vars to the API service (or let `render.yaml` do it):
   ```env
   JWT_SECRET=<long-random-string>          # REQUIRED — reuse application default in dev, override in prod
   DB_URL=jdbc:postgresql://<host>:5432/taskflow?sslmode=require
   DB_USERNAME=taskflow
   DB_PASSWORD=<password>
   CORS_ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
   ```
4. Render builds the Dockerfile and runs `java -jar target/app.jar`; API is at `https://taskflow-api.onrender.com`.
   First start seeds the DB with users: `admin@taskflow.dev` / `Admin@123` (ADMIN), `srisai@taskflow.dev` / `Demo@123`, `priya@taskflow.dev` / `Demo@123`.
   > If you prefer to stay on H2 in-memory (no DB setup), skip the DB env vars — the app runs entirely in memory (data resets on restart, fine for a demo).

### 3. Frontend → Vercel
1. vercel.com → **New Project** → Import **TaskFlow** GitHub repo → Root: `frontend`.
2. Build: `npm run build`, Output: `dist` (already in `vercel.json`).
3. Env var (production): `VITE_API_BASE_URL=https://taskflow-api.onrender.com/api`
4. Deploy — SPA rewrites handle client-side routing automatically.

### 4. Wire them together
- Frontend (Vercel) → `VITE_API_BASE_URL` → Backend (Render) at `/api`.
- Backend accepts CORS from your `CORS_ALLOWED_ORIGINS` (`frontend/.../?` — app's `CorsConfig` reads `CORS_ALLOWED_ORIGINS` or defaults to vite dev URLs).
- JWT is signed with `JWT_SECRET`; logins work end-to-end.

## Alternative (single host): Render both, no Postgres
Optionally host `frontend/dist` as a tiny static site asset in the same web service, or keep the DB as H2 (in-memory) for a zero-config demo. This repo is fully runnable locally with just Maven + Node too — see README.

## Other files
- `backend/Dockerfile` — multi-stage Maven → JRE 23 run image (used by Render).
- `render.yaml` — Render Blueprint (Postgres database + API web service).
- `vercel.json` — Vercel SPA config (rootDir `frontend`, `dist` output, rewrites).
- `frontend/.env.example` — `VITE_API_BASE_URL` example for the frontend.