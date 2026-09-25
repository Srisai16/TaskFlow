# TaskFlow — Collaborative Project & Task Management (mini-Jira)

A full-stack Java + React application for teams to manage projects, track tasks on a
kanban board, comment, and receive **real-time WebSocket notifications**.

Built as a resume/portfolio project targeting **Java Full Stack (Java + UI)** roles.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Backend    | Spring Boot 3.4, Spring Web, Spring Data JPA, Spring Security (JWT + BCrypt), Spring WebSocket |
| Database   | MySQL 8 (prod profile) / H2 in-memory (instant demo, zero setup) |
| Frontend   | React 18, Vite, React Router, axios, native WebSocket |
| Testing    | JUnit 5, Mockito, AssertJ |
| Build      | Maven (wrapper included), npm |

## Features

- **Auth** — register/login with JWT, BCrypt password hashing, role-based access (ADMIN / MANAGER / MEMBER).
- **Projects** — create / update / delete, add & remove members, membership-gated access.
- **Tasks** — create / edit / delete, status lifecycle (To Do → In Progress → In Review → Done),
  priorities, due dates, assignees, search/filter/sort.
- **Kanban board** — 4-column status UI with one-click stage moves.
- **Dashboard** — live stats: total, in-progress, done, overdue, completion %, priority breakdown,
  and per-member breakdown computed with Java Streams & `Collectors.groupingBy`.
- **Comments** — threaded comments per task with ownership/permission control.
- **Real-time notifications** — WebSocket pushes on task-assign and comment events; bell with unread badge.
- **DSA showcase** — `getNextDueTasks` uses a `PriorityQueue` (min-heap) with a custom Comparator
  to surface the most urgent open tasks; visible in the app + covered by tests.

## Project layout

```
taskflow/
├── backend/                   # Spring Boot REST API
│   ├── src/main/java/com/taskflow/
│   │   ├── config/            # Security, WebSocket, data seeder
│   │   ├── controller/        # REST controllers
│   │   ├── dto/               # Java records (immutable request/response DTOs)
│   │   ├── entity/            # JPA entities + enums
│   │   ├── exception/         # @RestControllerAdvice global handling
│   │   ├── repository/        # Spring Data JPA repositories
│   │   ├── security/          # JWT filter/util, UserDetailsService
│   │   ├── service/           # business logic (transaction-aware)
│   │   └── websocket/         # notification WebSocket handler
│   └── src/test/java/         # JUnit 5 + Mockito service tests
├── frontend/                  # React SPA (Vite)
│   └── src/
│       ├── api/               # axios client + interceptors
│       ├── components/        # Navbar, Modal, TaskCard, modals...
│       ├── context/           # AuthContext
│       ├── hooks/             # useNotifications (WebSocket)
│       └── pages/             # Login, Register, Dashboard, Project (kanban)
└── docs/schema-mysql.sql      # reference MySQL schema + indexes
```

## Quick start (zero-database demo — H2)

Requirements: **Java 17+** (tested on 23) and **Node 18+** (npm). Maven and MySQL are optional.

```bash
# 1. Backend (first run downloads Maven + deps, allow a few minutes)
cd backend
mvnw.cmd spring-boot:run        # Windows   (Linux/macOS: ./mvnw spring-boot:run)
# server starts on http://localhost:8080   |   H2 console: /h2-console

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Open **http://localhost:5173** and sign in with any seeded account:

| Email                 | Password   | Role    |
|-----------------------|------------|---------|
| admin@taskflow.dev    | Admin@123  | ADMIN   |
| srisai@taskflow.dev   | Demo@123   | MEMBER  |
| priya@taskflow.dev    | Demo@123   | MEMBER  |

> Demo data (users, one project, six tasks, comments) is seeded automatically when the
> DB is empty. Disable with `--spring-boot.run.arguments=--app.seed.enabled=false`.

## Using MySQL (production-style profile)

1. Run `docs/schema-mysql.sql` against your MySQL server (or let Hibernate create tables).
2. Start the backend with:

```bash
set MYSQL_USER=root
set MYSQL_PASSWORD=yourpass
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mysql
```

3. Set `app.jwt.secret` to a long random secret in production.

## Backend tests

```bash
cd backend
mvnw.cmd test
```

7 tests cover the two service layers that hold the interesting logic:
- `TaskServiceTest` — priority-queue ordering for next-due, limit bounding, stream filtering & sorting.
- `DashboardServiceTest` — status/overdue/completion aggregations and zero-safe math on empty data.

## Key API endpoints

```
POST  /api/auth/register | /login          JWT auth
GET   /api/auth/me                         current user
GET   /api/projects                        my projects
POST  /api/projects                        create project
GET/PUT/DELETE /api/projects/{id}          project CRUD
POST/DELETE /api/projects/{id}/members     manage members
GET   /api/projects/{id}/tasks             list with ?status&priority&assigneeId&q&sortBy
GET   /api/projects/{id}/tasks/next-due    most urgent open tasks (PriorityQueue)
POST/PUT/DELETE .../tasks                 task CRUD
PATCH .../tasks/{taskId}/status            move between stages
GET/POST .../tasks/{taskId}/comments      comments
GET   /api/projects/{id}/dashboard         stats
GET   /api/notifications ...               notifications (WebSocket push at /ws/notifications)
```

## Key Features

- **Layered architecture & SOLID** — controller → service → repository, DTOs as Java `record`s,
  constructor injection, focused single-responsibility services.
- **DSA in real code** — explain the `PriorityQueue` (binary heap) in `TaskService.getNextDueTasks`
  and why heap-bounding to N gives O(n + k·log n) behavior vs. naive full sorting.
- **Streams**: `filter`-chain with composed `Predicate`s for search, `Collectors.groupingBy +
  counting` for dashboards, `toMap`/comparators for ordering.
- **OOP & enums**: immutable DTOs, sealed-ish behavior via enums, single inverted-dependency seam
  (`NotificationService`) for assign/comment events.
- **SQL/DBMS** — normalized schema, composite indexes tuned for query paths (`idx_tasks_project_status`),
  and the overdue reporting query shown in `docs/schema-mysql.sql`.
- **Security** — stateless JWT flow, BCrypt, `SecurityFilterChain`, method-level access, input validation.
- **Transactions** — explicit `@Transactional(readOnly=true)` on read paths (avoids the OSIV anti-pattern).
- **Real-time** — `TextWebSocketHandler` session registry with subscribe message; graceful re-connect polling.
- **Testing** — JUnit 5 + Mockito + AssertJ on service logic.