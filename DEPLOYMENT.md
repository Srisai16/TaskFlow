# TaskFlow — Deployment Guide

This repository hosts the full-stack **TaskFlow** app:
- **backend/** — Spring Boot 3.4 / Java 17+ / JWT Auth / H2 in-memory (dev) / MySQL-ready
- **frontend/** — React 18 + Vite + React Router (SPA)

Two options below. **Option A (recommended, free-tier friendly)**: Render backend + Vercel frontend.

---

## Option A — Render (backend) + Vercel (frontend)

### 1. Push to GitHub
```bash
git init -b main
git add -A
git commit -m "TaskFlow full-stack"
git branch -M main
git remote add origin https://github.com/Srisai16/TaskFlow.git
git push -u origin main
```

### 2. Backend on Render
1. Render Dashboard → **New → Blueprint** → connect the GitHub repo (or **Web Service**).
2. `render.yaml` at the repo root provisions:
   - `taskflow-api` (Docker web service, `rootDir: backend`) — auto-creates a real PostgreSQL `taskflow-db`.
   - Injects `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, a generated `JWT_SECRET`, and `CORS_ALLOWED_ORIGINS`.
3. Backend URL looks like `https://taskflow-api.onrender.com`.

### 3. Frontend on Vercel
1. Import the repo; `vercel.json` now sets `rootDirectory: frontend`, build `npm run build`, output `dist`, SPA rewrites.
2. Add **Env Var**: `VITE_API_BASE_URL = https://taskflow-api.onrender.com/api`
3. **Trick**: replacing the `/api` prefix is handled by Vite's `import.meta.env.VITE_API_BASE_URL` — a single env var flips every request from the dev proxy to the Render backend. If you prefer a plain (no-proxy) setup, in production the browser hits Render directly and CORS is already allow-listed.

### CORS note
Backend dev CORS defaults to `http://localhost:5173`. In prod set `CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app` (Render injects it via env).

---

## Option B — Render only (both services)
Add a second Web Service for the frontend: root `frontend`, build `npm run build`, start `npx serve -s dist`.

---

## Local run
```bash
# backend (H2 in-memory, port 8080)
cd backend && mvnw spring-boot:run
# frontend (dev + proxy, port 5173)
cd frontend && npm i && npm run dev
```
Demo logins: `admin@taskflow.dev / Admin@123`, `srisai@taskflow.dev / Demo@123`, `priya@taskflow.dev / Demo@123`.

Tests: `cd backend && ./mvnw test` (7 passing).