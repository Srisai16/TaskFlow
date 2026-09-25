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
- **Frontend** (Vercel free): React 18 + Vite SPA. `frontend/vercel.json` configures a Vite project when the Vercel Root Directory is `frontend`; the repository-root `vercel.json` is an alternative for projects left at `.`. Set both `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` in Vercel. The Vite dev proxy still uses `/api` locally.

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
1. vercel.com → **New Project** → Import the **TaskFlow** GitHub repository.
2. Set **Root Directory** to `frontend` (recommended). Vercel reads `frontend/vercel.json`, runs `npm ci` and `npm run build`, and serves `dist`. If the project is left at repository root `.`, the root `vercel.json` builds `frontend` instead.
3. Add these **Production** environment variables:
   ```env
   VITE_API_BASE_URL=https://taskflow-api.onrender.com/api
   VITE_WS_BASE_URL=https://taskflow-api.onrender.com
   ```
   Replace the hostname with the actual Render service URL. Do not add a trailing slash to `VITE_WS_BASE_URL`.
4. Deploy. The SPA rewrite handles client-side routes such as `/projects/123`.
5. In Render, set `CORS_ALLOWED_ORIGINS` to the exact Vercel production URL, for example `https://taskflow-frontend.vercel.app`, and redeploy the API if it was already running.

### 4. Wire them together
- Frontend REST requests use `VITE_API_BASE_URL` → Render at `/api`.
- Frontend live notifications use `VITE_WS_BASE_URL` → Render at `/ws/notifications`; the client converts `https://` to `wss://` automatically.
- Backend accepts browser requests from the exact Vercel origin in `CORS_ALLOWED_ORIGINS`; WebSocket connections use the same Render host.
- JWT is signed with `JWT_SECRET`; logins work end-to-end.

## Alternative (single host): Render both, no Postgres
Optionally host `frontend/dist` as a tiny static site asset in the same web service, or keep the DB as H2 (in-memory) for a zero-config demo. This repo is fully runnable locally with just Maven + Node too — see README.

## Other files
- `backend/Dockerfile` — multi-stage Maven → JRE 23 run image (used by Render).
- `render.yaml` — Render Blueprint (Postgres database + API web service).
- `vercel.json` — root-level Vercel fallback config for projects left at `.`.
- `frontend/vercel.json` — Vercel SPA config when Root Directory is `frontend`.
- `frontend/.env.example` — local and production API/WebSocket variable names.