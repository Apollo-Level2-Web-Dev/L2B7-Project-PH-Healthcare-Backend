# PH Healthcare System — Backend

REST API for a doctor-appointment platform: patients book consultations, doctors run them, admins manage the platform. This repo is the backend only.

**Stack:** Node.js · Express 5 · TypeScript · Prisma 7 · PostgreSQL · JWT auth

## Where the project stands today

This is an early build, not the finished product. Right now the only working feature is authentication — a patient can register, log in, and fetch their own profile. Appointments, doctor schedules, payments, and everything else in [`Project Requirements.md`](./Project%20Requirements.md) is planned but not built yet.

Treat this README as a description of what the code *actually does today*, including its rough edges. A few are called out directly in [Known limitations](#known-limitations) further down — read that section before assuming something is broken on your end.

## Prerequisites

| Tool           | Version | Check with |
| -------------- | ------- | ---------- |
| **Node.js**    | 20+     | `node -v`  |
| **PostgreSQL** | 14+     | `psql -V`  |

Any package manager works (npm, pnpm, yarn, bun). The examples below use `npm`.

## Getting started

**1. Install dependencies**

```bash
npm install
```

**2. Set up your environment file**

```bash
cp .env.example .env
```

Open `.env` and point `DATABASE_URL` at a Postgres database you can connect to:

```
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/ph_healthcare?schema=public"
```

The database doesn't need to exist beforehand — `prisma migrate dev` creates it. The other variables in `.env.example` are fine to leave as-is for local development; see [Environment variables](#environment-variables) for what each one does.

**3. Generate the Prisma client**

```bash
npx prisma generate
```

Prisma writes a typed client into `src/generated/prisma`. That folder is git-ignored, so a fresh clone never has it, and almost every file under `src/` imports from it — skip this step and nothing compiles. Re-run it any time you change a file in `prisma/schema/`.

**4. Run the migrations**

```bash
npx prisma migrate dev
```

This creates the `user` and `patient` tables using the SQL already committed under `prisma/migrations/`.

**5. Start the server**

```bash
npm run dev
```

You should see:

```
Connected to the database successfully.
Server is running on port 5000
```

Confirm it's up:

```bash
curl http://localhost:5000/
# {"success":true,"message":"Welcome to PH Healthcare System Backend"}
```

## Environment variables

`src/app/config/index.ts` is the only place `process.env` is read — application code should import `config` from there rather than reaching for `process.env` directly.

| Variable                  | What it's for                                                      |
| -------------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`                 | `development` includes the raw error and stack trace in API error responses |
| `PORT`                     | Port the HTTP server listens on                                    |
| `DATABASE_URL`             | Postgres connection string, used by both Prisma and the app        |
| `JWT_ACCESS_SECRET`        | Signing key for access tokens                                      |
| `JWT_REFRESH_SECRET`       | Signing key for refresh tokens                                     |
| `JWT_ACCESS_EXPIRES_IN`    | Access token lifetime (e.g. `15m`, `1d`)                            |
| `JWT_REFRESH_EXPIRES_IN`   | Refresh token lifetime                                              |
| `BCRYPT_SALT_ROUNDS`       | Read into config but not wired up yet — password hashing currently uses a hardcoded value (see below) |
| `BACKEND_URL`              | Read into config but not used anywhere yet                          |
| `FRONTEND_URL`             | Added to the CORS allowlist                                        |

There's no validation on startup: if a variable is missing, `config` simply holds `undefined` for it, and the app boots anyway. The first sign of trouble is usually a runtime error the moment that value is actually used — for `JWT_ACCESS_SECRET`, that means the very first login or registration.

Before deploying anywhere, replace the JWT secrets — the ones in `.env.example` are placeholders anyone can guess:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Project structure

```
src/
├── server.ts                       # connects to the DB, then starts listening
├── app.ts                          # express app: cors, body parsing, routes, error handling
├── generated/prisma/                # Prisma client — git-ignored, run `npx prisma generate`
└── app/
    ├── config/index.ts              # reads and exposes every environment variable
    ├── lib/prisma.ts                # shared PrismaClient instance — always import this, don't `new` your own
    ├── middleware/
    │   ├── checkAuth.ts             # exports `auth(...roles)`, the JWT + role guard
    │   ├── globalErrorHandler.ts    # turns thrown errors into JSON responses
    │   └── notFound.ts              # catch-all for unmatched routes
    ├── utils/
    │   ├── catchAsync.ts            # wraps async route handlers so thrown errors reach the error handler
    │   ├── jwt.ts                   # sign / verify helpers
    │   └── sendResponse.ts          # the standard `{ success, statusCode, message, data }` envelope
    └── module/
        └── auth/                    # the one feature module that exists so far
            ├── auth.route.ts
            ├── auth.controller.ts
            ├── auth.service.ts
            └── auth.interface.ts

prisma/
├── schema/
│   ├── schema.prisma                # generator + datasource only
│   ├── user.prisma
│   ├── patient.prisma
│   └── enums.prisma                 # Role, UserStatus, Gender
└── migrations/                      # generated SQL, committed to git
```

Prisma's schema is split across multiple files, wired together by `prisma.config.ts` at the repo root. That file also loads `.env` so the Prisma CLI can see `DATABASE_URL`.

**The data model:** a `User` has at most one `Patient` (1-to-1). Registering writes both rows in a single nested Prisma call. Deletes are meant to be soft — there's an `isDeleted` flag and a `deletedAt` timestamp on both models — but nothing in the codebase sets them yet; there's no delete endpoint at all right now.

## The API

Base URL: `http://localhost:5000`

| Method | Path                          | Auth required | Body                         |
| ------ | ----------------------------- | ------------- | ----------------------------- |
| `GET`  | `/`                            | –             | health check                  |
| `POST` | `/api/v1/auth/register`        | –             | `name`, `email`, `password`   |
| `POST` | `/api/v1/auth/login`           | –             | `email`, `password`           |
| `GET`  | `/api/v1/auth/me`              | yes           | –                              |
| `POST` | `/api/v1/auth/refresh-token`   | –             | reads the `refreshToken` cookie |

Every response from `sendResponse` (i.e. everything except the root route) has this shape:

```json
{ "success": true, "statusCode": 200, "message": "...", "data": {} }
```

### Tokens: use the response body, not the cookies

`register` and `login` return `accessToken` and `refreshToken` two ways: in the JSON body, and as cookies. **Use the JSON body.** The cookies are set with `sameSite: "none"` but `secure: false` — that combination is invalid under the cookie spec, and modern browsers silently drop the cookie rather than send it. Grab `data.accessToken` from the response and send it yourself:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","email":"patient@example.com","password":"password123"}'

curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken from the response above>"
```

`Authorization` accepts either `Bearer <token>` or the raw token with no prefix.

## Roles and authentication

Four roles exist in the schema — `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `PATIENT` — but **registration always creates a `PATIENT`.** `registerPatient` hardcodes `Role.PATIENT` and only reads `name`, `email`, and `password` out of the request body, so sending `"role": "ADMIN"` does nothing. There's no admin module and no seed script, so the other three roles aren't reachable through the API yet. To test them, register a normal user and change their `role` directly in the database with `npx prisma studio` (opens at `http://localhost:5555`) — then log in again, since the role is baked into the token at login time and an old token keeps the old role.

`auth(...roles)`, exported from `checkAuth.ts`, is the route guard:

```ts
router.get('/me', auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN), AuthController.getMe)
```

What it actually does, in order:

1. Reads the token from the `accessToken` cookie, falling back to the `Authorization` header.
2. Verifies the JWT signature.
3. Checks the role **from the token payload** against the roles the route allows.
4. Looks the user up in the database by matching `id`, `email`, `name`, *and* `role` all at once — if any of those four have changed since the token was issued, the lookup fails and the request is rejected, even though the account still exists.
5. Rejects the request only if the user's `status` is exactly `BLOCKED`. It does **not** check `isDeleted` or a `DELETED` status, so a soft-deleted account can still authenticate as long as `status` wasn't also set to `BLOCKED`.

## Known limitations

Worth knowing before you spend time debugging what looks like your own mistake:

- **Every error comes back as HTTP 500.** `globalErrorHandler` works out the "correct" status code internally but always sends the response with `500`, regardless. Read the `message` field, not the status code, to see what actually went wrong.
- **No request validation.** Nothing checks that `email` looks like an email or that `password` meets any length requirement — Postgres and Prisma are the only things that will reject bad input, and usually not with a helpful message.
- **`BCRYPT_SALT_ROUNDS` isn't used.** Password hashing in `auth.service.ts` calls `bcrypt.hash(password, 8)` with a hardcoded cost factor; the environment variable is read into `config` but nothing references it yet.
- **No tests.** `npm test` is a placeholder.

## Extending this starter

New features go under `src/app/module/<name>/` as four files with strict responsibilities:

| File                   | Responsibility                                                    |
| ---------------------- | ------------------------------------------------------------------- |
| `<name>.route.ts`      | Wires `auth(...roles)` to controller functions, exports `<Name>Routes` |
| `<name>.controller.ts` | Reads `req.body` / `req.user`, calls the service, calls `sendResponse` |
| `<name>.service.ts`    | All business logic and every Prisma call for the module              |
| `<name>.interface.ts`  | The TypeScript types for the module's payloads                       |

Then mount it in `app.ts` next to the existing line:

```ts
app.use('/api/v1/doctor', DoctorRoutes)
```

Two rules keep the module boundaries useful rather than decorative:

- **Controllers never call Prisma directly**, and **services never touch `req` or `res`.** If a service needs to know who's calling it, pass it the small `{ userId, email, name, role }` shape, not the whole request.
- **Never spread `req.body` straight into a Prisma `create`/`update`.** Destructure the exact fields you expect. With no validation layer in front of the API, that destructuring is the only thing stopping someone from sending `"role": "ADMIN"` in a request body and having it stick.

## Scripts

```bash
npm run dev     # start the server with auto-reload (tsx watch) — use this while developing
npm run build   # typecheck with tsc and emit to dist/
npm run start   # run the server once, no watching
```

There's no `npm run generate` / `migrate` / `studio` wrapper — call Prisma's CLI directly:

```bash
npx prisma generate     # regenerate the client after editing prisma/schema/
npx prisma migrate dev  # create + apply a migration
npx prisma studio       # browser GUI for your data, at http://localhost:5555
```

### A note on `npm run build`

`npm run build` is useful for catching type errors, but its output isn't directly runnable with `node`. The codebase uses extensionless relative imports (`from './app'`), which `tsx` resolves fine but Node's native ESM loader doesn't — running `node dist/src/server.js` fails with `ERR_UNSUPPORTED_DIR_IMPORT`. That's why `npm run start` runs the TypeScript source through `tsx` rather than executing `dist/`.

## Troubleshooting

**`Cannot find module '.../src/generated/prisma/client'`**
Run `npx prisma generate` — see step 3 of [Getting started](#getting-started).

**`Can't reach database server` / `ECONNREFUSED`**
Postgres isn't running, or `DATABASE_URL` points somewhere it can't reach. Confirm with `pg_isready -h localhost -p 5432`.

**`P1010: User was denied access on the database`**
The username or password in `DATABASE_URL` doesn't match a real role on your Postgres server. `psql -c '\du'` lists the roles that actually exist; `whoami` gives you your OS username, which is usually your local superuser with no password.

**Login or register throws instead of returning a token**
Check that `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are actually set in your `.env` — `jsonwebtoken` throws if the signing secret is `undefined`, and this project doesn't validate environment variables on startup.
