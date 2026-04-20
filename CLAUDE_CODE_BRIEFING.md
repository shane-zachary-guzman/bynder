# Bynder — Claude Code Agent Briefing

You are picking up a card inventory web app called **Bynder** that has been fully
architected and backend-scaffolded. This document tells you everything you need to
know to continue the work.

---

## 1. Project overview

Bynder is a card inventory app (think trading cards — Pokémon, Magic: The Gathering,
etc.) with a Free and Pro subscription tier. Users can create collections and add
cards to them. Pro users get unlimited collections and cards; Free users are capped
at 1 collection and 50 cards per collection.

---

## 2. Tech stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Angular + PrimeNG                   |
| Backend     | Express.js + TypeScript             |
| Database    | PostgreSQL 16                       |
| Auth        | JWT (httpOnly cookie + Bearer header), email/password (Google OAuth deferred) |
| Payments    | Stripe (subscriptions, webhooks, customer portal) |
| Hosting     | Render.com (frontend as static site, backend as web service, managed Postgres) |
| CI/CD       | GitHub Actions → Render deploy hook |
| Local dev   | Docker Compose                      |

---

## 3. Repository structure

Monorepo. Single GitHub repo, structured as follows:

```
bynder/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions: test → deploy on main
├── docker-compose.yml              # Production-style local stack
├── docker-compose.dev.yml          # Dev overlay: tsx watch hot reload
├── .env.example
├── README.md
│
├── backend/                        # Express + TypeScript
│   ├── Dockerfile                  # Two-stage: builder (tsc) → runtime (node)
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── package.json
│   ├── .env.example
│   ├── db/
│   │   └── migrations/             # Auto-run by Postgres on first boot
│   │       ├── 001_users.sql
│   │       ├── 002_subscriptions.sql
│   │       ├── 003_collections.sql
│   │       └── 004_cards.sql
│   └── src/
│       ├── server.ts               # Entry point
│       ├── types/
│       │   └── index.ts            # All domain types + Express augmentation
│       ├── config/
│       │   └── db.ts               # pg Pool singleton
│       ├── middleware/
│       │   ├── auth.middleware.ts  # JWT verify → req.user
│       │   └── planGuard.middleware.ts  # requirePro, checkCollectionLimit, checkCardLimit
│       ├── models/
│       │   ├── user.model.ts
│       │   ├── collection.model.ts
│       │   └── card.model.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── collection.controller.ts
│       │   └── card.controller.ts
│       └── routes/
│           ├── auth.routes.ts
│           ├── collection.routes.ts
│           └── card.routes.ts
│
└── frontend/                       # Angular + PrimeNG (NOT YET SCAFFOLDED)
    ├── Dockerfile                  # Build: ng build → Runtime: nginx
    ├── nginx.conf                  # Proxies /api/ to backend, handles Angular routing
    └── src/
        └── app/
            ├── auth/               # login, register components
            ├── cards/              # list, detail, add components
            ├── billing/            # pricing page, portal redirect
            └── shared/             # auth guard, API service, plan guard
```

---

## 4. Backend — what is complete

All files compile cleanly (`tsc --noEmit` passes with zero errors).

### API routes

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me                         ← requires auth

GET    /api/collections                     ← requires auth
POST   /api/collections                     ← requires auth + checkCollectionLimit
GET    /api/collections/:id                 ← requires auth
PUT    /api/collections/:id                 ← requires auth
DELETE /api/collections/:id                 ← requires auth

GET    /api/collections/:collectionId/cards         ← requires auth
POST   /api/collections/:collectionId/cards         ← requires auth + checkCardLimit
GET    /api/collections/:collectionId/cards/:id     ← requires auth
PUT    /api/collections/:collectionId/cards/:id     ← requires auth
DELETE /api/collections/:collectionId/cards/:id     ← requires auth

GET    /health
```

### Plan gating logic

Free tier limits are defined as constants in `planGuard.middleware.ts`:
- `FREE_LIMITS.collections = 1`
- `FREE_LIMITS.cardsPerCollection = 50`

Every card operation first verifies the collection belongs to the authenticated user
before touching card data (prevents IDOR attacks).

### Auth

JWT signed with `JWT_SECRET`, 7-day expiry. Token is set as an httpOnly cookie
(`bynder_token`) and also returned in the response body for API clients.
`authenticate` middleware accepts the token from either the cookie or an
`Authorization: Bearer <token>` header.

### Database

Migrations are plain `.sql` files mounted into Postgres via Docker Compose
(`/docker-entrypoint-initdb.d`). They run automatically on first boot.

Key schema decisions:
- `users.password_hash` and `users.google_id` are both nullable — supports
  email/password, Google OAuth, or both on the same account.
- A free `subscriptions` row is created atomically with every new user (single
  Postgres transaction in `UserModel.create`).
- `cards.metadata` is `JSONB` with a GIN index — stores game-specific fields
  (rarity, foil, grading) without schema migrations per game type.
- `cards.estimated_value` is `DECIMAL(10,2)` — pg returns this as a string;
  the `Card` type reflects that (`estimated_value: string | null`).

---

## 5. What still needs to be built

### 5a. Frontend (Angular + PrimeNG) — highest priority

The frontend has not been scaffolded at all. Build it as a standard Angular
standalone-components app. Key requirements:

- **Auth module**: register and login forms, JWT stored in a cookie (already
  handled by the backend `Set-Cookie` response), `AuthGuard` to protect routes.
- **Collections module**: list view (PrimeNG DataView or Table), create/edit
  dialog (PrimeNG Dialog + ReactiveForm), delete confirmation.
- **Cards module**: card list within a collection, add/edit card form with
  condition dropdown (mint → poor), estimated value input, image URL field,
  metadata JSON editor.
- **Billing module**: pricing page showing Free vs Pro, upgrade button that
  redirects to Stripe Checkout (backend endpoint TBD), plan badge in navbar.
- **Shared**: `ApiService` (HttpClient wrapper pointing at `/api`), `AuthService`
  (holds current user + plan state), `PlanGuardDirective` to disable UI elements
  for Free users.
- `nginx.conf` is already written — it proxies `/api/*` to `http://backend:3000`
  and falls back to `index.html` for Angular routing.

### 5b. Stripe billing endpoints — backend

These routes are not yet built:

```
POST /api/billing/checkout      ← creates Stripe Checkout Session, returns URL
POST /api/billing/portal        ← creates Stripe Customer Portal session
POST /api/webhooks/stripe       ← raw body, verifies signature, syncs plan to DB
```

Webhook events to handle: `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`.

The `subscriptions` table is already migrated and ready to receive Stripe IDs.

### 5c. Google OAuth — backend + frontend

Deferred intentionally. When adding: use `passport-google-oauth20`. The
`users.google_id` column already exists. The JWT signing logic in
`auth.controller.ts` is shared and reusable.

### 5d. GitHub Actions CI workflow

Create `.github/workflows/ci.yml`:
1. `npm ci` + `npx tsc --noEmit` + `npm test` on the backend
2. `npm ci` + `ng build --configuration=production` on the frontend
3. On success, `curl -X POST $RENDER_DEPLOY_HOOK_URL` to trigger Render deploy

Store `RENDER_DEPLOY_HOOK_URL` as a GitHub Actions secret.

---

## 6. Environment variables

```bash
# Backend (.env)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://bynder:bynder_pass@postgres:5432/bynder_db
JWT_SECRET=<64-byte random hex>
FRONTEND_URL=http://localhost:4200
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=        # leave blank until OAuth is added
GOOGLE_CLIENT_SECRET=    # leave blank until OAuth is added
```

---

## 7. Local dev commands

```bash
# First time setup
cp backend/.env.example backend/.env
# Edit backend/.env — fill in JWT_SECRET at minimum

# Start full stack with hot reload (tsx watch on backend)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production-style build
docker compose up --build

# Wipe database and start fresh
docker compose down -v

# Typecheck backend only
cd backend && npx tsc --noEmit

# Run backend tests
cd backend && npm test
```

---

## 8. Render deployment (when ready)

- **Frontend**: create a Static Site on Render, build command `npm run build`,
  publish directory `dist/frontend/browser`.
- **Backend**: create a Web Service on Render, select the repo, Render detects
  the `Dockerfile` automatically. Set all env vars from section 6 in the
  Render dashboard.
- **Database**: create a managed Postgres instance on Render. Copy the
  `DATABASE_URL` into the backend service's environment variables. Run
  migrations manually on first deploy:
  `psql $DATABASE_URL -f backend/db/migrations/001_users.sql` etc.
- Free tier note: the Postgres instance is deleted after 90 days on the free
  plan. Upgrade to the $7/mo Individual plan to persist it.

---

## 9. Key conventions to follow

- All backend route handlers must be `async` and return `Promise<void>` — never
  return the `res.json()` result.
- Always use parameterised queries (`$1, $2, ...`) — no string interpolation in
  SQL.
- Validate all request bodies with Zod before touching the database.
- Plan checks must happen server-side in middleware — never trust the frontend.
- `req.params` values come in as strings — always `Number(req.params['id'])`
  before passing to model functions.
- Use `rows[0] ?? null` pattern (not `rows[0]`) — `noUncheckedIndexedAccess` is
  enabled in `tsconfig.json` and will error otherwise.