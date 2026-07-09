<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="NestJS" />
  <h1 align="center"><code>⌘ Auth API</code></h1>
</p>

<p align="center">
  <b>Production‑ready authentication template</b> — NestJS 11 · Prisma ORM · JWT · RBAC · Rate‑limiting · Structured logging
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/Node%2020-339933?logo=nodedotjs&logoColor=fff" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS%2011-E0234E?logo=nestjs&logoColor=fff" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript%206-3178C6?logo=typescript&logoColor=fff" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma%205-2D3748?logo=prisma&logoColor=fff" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=fff" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=fff" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff" />
</p>

---

## ✦ Overview

A **standardized REST API** for user authentication, built as a starter template that scales from local prototyping to production deployments.

| Feature | Status |
|---------|--------|
| Registration via single‑use invite codes | ✅ |
| Invite code generation (Admin / Moderator) | ✅ |
| JWT access tokens (short‑lived) | ✅ |
| Refresh token rotation (UUID + DB storage) | ✅ |
| Role‑Based Access Control (Admin / Moderator / Donator / User) | ✅ |
| Rate limiting (configurable) | ✅ |
| Structured JSON logging (Pino) | ✅ |
| Multi‑database support (5 providers) | ✅ |
| Swagger / OpenAPI docs | ✅ |
| Docker Compose (NestJS + PostgreSQL) | ✅ |
| E2E test suite (31 tests) | ✅ |

---

## ✦ Quick Start

```bash
npm install
npm run setup                    # generate Prisma client → push schema → seed
npm run dev                      # http://localhost:4000
```

```bash
# register
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@test.com","password":"Str0ng!Pass","inviteCode":"INVITE-2024-001"}'

# login
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"Str0ng!Pass"}'

# profile
curl http://localhost:4000/api/user/profile \
  -H 'Authorization: Bearer <TOKEN>'
```

> Swagger UI is available at [`http://localhost:4000/docs`](http://localhost:4000/docs).

---

## ✦ Swagger / OpenAPI

The API is fully documented with **@nestjs/swagger** (OpenAPI 3.0). After starting the server, visit:

| Resource | URL |
|----------|-----|
| Swagger UI | [`http://localhost:4000/docs`](http://localhost:4000/docs) |
| OpenAPI JSON | [`http://localhost:4000/docs-json`](http://localhost:4000/docs-json) |

### Tags

Endpoints are organized under two tags in the Swagger UI:

| Tag | Endpoints | Auth |
|-----|-----------|------|
| **Authentication** | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/invite-codes` | Register/login/refresh/logout are `@Public()` — no token needed; `invite-codes` requires `ADMIN` or `MODERATOR` role + Bearer token |
| **Users** | `GET /user/profile` · `GET /user` · `PATCH /user/:id/role` | Bearer token required; list & role endpoints restricted to `ADMIN` |

### Authorize button 🔑

The Swagger UI has an **Authorize** button in the top‑right corner. Paste your JWT access token there (without the `Bearer` prefix) to unlock protected endpoints. Tokens can be obtained from `POST /auth/login` or `POST /auth/register`.

### Example flow

1. Open [`http://localhost:4000/docs`](http://localhost:4000/docs)
2. Try `POST /auth/login` with `{"username": "admin", "password": "Admin1234"}`
3. Copy the `accessToken` from the response
4. Click **Authorize** and paste the token → click **Authorize**
5. Now you can call `GET /user` and `PATCH /user/:id/role` directly from the UI

### Response schema

Every endpoint returns the standardized envelope. The Swagger UI displays the exact schema for both success and error responses, including field types, validation rules, and examples for each DTO.

---

## ✦ Database Providers

The template ships with **five Prisma schemas** — switch with a single command:

```bash
npm run db:switch postgres          # PostgreSQL
npm run db:switch mysql            # MySQL
npm run db:switch mssql            # Microsoft SQL Server
npm run db:switch mongo            # MongoDB
npm run db:switch sqlite           # SQLite (default)
```

Each command copies the matching provider schema to `prisma/schema.prisma` and prints a `DATABASE_URL` hint.

> **Note:** `npm run setup` generates the client and pushes the schema. Run it after switching providers.

### Provider schemas

```
prisma/providers/
├── schema.postgres.prisma      # PostgreSQL
├── schema.mysql.prisma         # MySQL
├── schema.mssql.prisma         # SQL Server
├── schema.mongodb.prisma       # MongoDB  (Δ: @db.ObjectId, no Cascade)
└── schema.sqlite.prisma        # SQLite   (Δ: no enums — String field)
```

---

## ✦ Architecture

```
src/
├── main.ts                     # Bootstrap · Pino Logger · Swagger · Global guards
├── app.module.ts               # Root module · ThrottlerModule · RolesGuard provider
├── common/
│   ├── constants/role.ts       # TS Role enum (ADMIN, MODERATOR, DONATOR, USER)
│   ├── decorators/roles.decorator.ts
│   ├── guards/roles.guard.ts   # @Roles() → 403 on mismatch
│   ├── response.interceptor.ts # { success, data, message, timestamp }
│   └── http-exception.filter.ts
├── auth/
│   ├── auth.controller.ts      # register · login · refresh · logout
│   ├── auth.service.ts
│   ├── token.service.ts        # JWT + refresh-token generation & rotation
│   ├── jwt.strategy.ts         # Passport strategy (sub + role in payload)
│   ├── jwt-auth.guard.ts       # Global guard · @Public() bypass
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── refresh.dto.ts
├── user/
│   ├── user.controller.ts      # profile · list (ADMIN) · updateRole (ADMIN)
│   └── user.service.ts
└── prisma/
    ├── prisma.service.ts       # Singleton PrismaClient
    └── prisma.module.ts
```

---

## ✦ Endpoints

All endpoints return the standard envelope (`success`, `data`, `message`, `timestamp`).

---

### `POST /api/auth/register`
Create an account. Requires a valid single‑use invite code.

**Request**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Str0ng!Pass",
  "inviteCode": "INVITE-2024-001"
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `username` | 3–30 chars, alphanumeric + underscores |
| `email` | valid email |
| `password` | 8–128 chars, uppercase + lowercase + digit |
| `inviteCode` | must exist and be unused |

**Response `201`**
```json
{
  "success": true,
  "data": { "accessToken": "…", "refreshToken": "uuid" },
  "message": "Created",
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

---

### `POST /api/auth/login`

**Request**
```json
{ "username": "john_doe", "password": "Str0ng!Pass" }
```

**Response `201`** — same shape as register.

---

### `POST /api/auth/refresh`
Exchange a valid refresh token for a new pair. **The old token is revoked** (rotation).

**Request**
```json
{ "refreshToken": "uuid-from-previous-response" }
```

**Response `201`** — new `accessToken` + `refreshToken`.

---

### `POST /api/auth/logout`
Revoke a refresh token immediately.

**Request**
```json
{ "refreshToken": "uuid-to-revoke" }
```

**Response `201`**
```json
{ "success": true, "data": { "message": "Logged out" }, … }
```

---

### `POST /api/auth/invite-codes` <sub>🔒 ADMIN / MODERATOR</sub>
Generate one or more single-use invite codes. Requires `ADMIN` or `MODERATOR` role.

**Request**
```json
{ "count": 1 }
```

| Field | Type | Default | Rules |
|-------|------|---------|-------|
| `count` | integer (optional) | `1` | 1–10 |

**Response `201`**
```json
{
  "success": true,
  "data": { "codes": ["INVITE-A1B2C3D4E5F6G7H8"] },
  "message": "Created",
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

---

### `GET /api/user/profile`
Requires `Authorization: Bearer <accessToken>`.

**Response `200`**
```json
{
  "success": true,
  "data": { "id": "…", "username": "john_doe", "email": "john@example.com", "role": "USER", "createdAt": "…" }
}
```

---

### `GET /api/user` <sub>🔒 ADMIN</sub>
List all users. `@Roles(Role.ADMIN)`.

---

### `PATCH /api/user/:id/role` <sub>🔒 ADMIN</sub>
Change a user's role.

**Request**
```json
{ "role": "MODERATOR" }
```

---

## ✦ Role Hierarchy

| Role | Tag | Permissions |
|------|-----|-------------|
| `ADMIN` | 🔒 | List users · Update roles · Generate invite codes |
| `MODERATOR` | 🛡 | Generate invite codes |
| `DONATOR` | ⭐ | (same as USER) |
| `USER` | 👤 | Profile, login, refresh |

Seeded users (password same as username + `1234`): `admin` / `mod` / `donor`.

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin1234"}'
```

---

## ✦ Rate Limiting

Configured globally via `@nestjs/throttler`:

| Variable | Default | Meaning |
|----------|---------|---------|
| `THROTTLE_TTL` | `60` | Window (seconds) |
| `THROTTLE_LIMIT` | `60` | Max requests per window |

Returns **`429 Too Many Requests`** when exceeded.

---

## ✦ Structured Logging

Uses **nestjs-pino** with `bufferLogs: true`. Logs are output as newline‑delimited JSON:

```json
{"level":30,"time":1720500000000,"pid":1,"hostname":"...","name":"NestFactory","msg":"Starting Nest application..."}
```

Add **pino-pretty** for human‑readable output in development:

```bash
npm run dev | npx pino-pretty
```

---

## ✦ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `4000` | HTTP port |
| `NODE_ENV` | `development` | Environment (controls `entrypoint.sh` behavior — production uses `migrate deploy`, dev uses `db push` + seed) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin (set to your frontend URL in production, e.g. `https://app.example.com`) |
| `DATABASE_URL` | `file:./dev.db` | Prisma datasource URL |
| `JWT_SECRET` | `dev-secret-123` | HMAC secret for access tokens |
| `JWT_EXPIRATION` | `15m` | Access token TTL (ms‑format, e.g. `15m`, `1h`) |
| `THROTTLE_TTL` | `60` | Rate‑limit window (seconds) |
| `THROTTLE_LIMIT` | `60` | Max requests per window |

---

## ✦ Docker Compose

```bash
npm run docker:build        # build image
npm run docker:up           # start api + postgres
npm run docker:down         # stop everything
```

> **First‑run step:** switch Prisma provider to PostgreSQL inside the container:
> ```bash
> docker compose exec api npm run db:switch postgres
> docker compose restart api
> ```

---

## ✦ Testing

```bash
npm run test:e2e
```

31 tests covering registration, login, refresh‑token rotation (incl. expired + revoked), logout, invite‑code generation, RBAC enforcement (incl. tampered JWT), validation, duplicate‑detection, and error‑response shape contract. A dedicated `test.db` is used and automatically cleaned up.

---

## ✦ Scripts Reference

| Script | Action |
|--------|--------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run dev` | Watch mode (auto‑restart) |
| `npm run start:prod` | Run from `dist/main.js` |
| `npm run setup` | `prisma:generate` + `prisma:push` + `seed` |
| `npm run seed` | Seed users (admin/mod/donor) + invite codes |
| `npm run test:e2e` | End‑to‑end test suite |
| `npm run db:switch <provider>` | Swap Prisma provider schema |
| `npm run docker:build` | `docker compose build` |
| `npm run docker:up` | `docker compose up -d` |

---

## ✦ License

MIT — free for any use.