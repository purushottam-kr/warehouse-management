# Warehouse Management (V3)

A warehouse inventory management application built with Next.js App Router, PostgreSQL, Drizzle ORM, and pnpm. Single-deployable monolith: server-rendered pages + colocated JSON API routes + service/repository data layer.

> Branch: `V3`. For the deep architecture study notes, see [README2.md](./README2.md).

## What's new in V3

- **Physical hierarchy:** `Warehouse → Aisle → Bay → Layer → StorageSpace`
  - New tables `aisles`, `bays`, `layers` (migration `0002_physical-hierarchy-step1.sql`).
  - `storage_spaces.layer_id` added (nullable in Step 1); `storage_spaces.warehouse_id` remains the authoritative link during migration.
  - Idempotent backfill script: `scripts/backfill-physical-hierarchy.mjs` creates an `UNASSIGNED` aisle/bay/layer chain per warehouse and repoints spaces with `NULL` `layer_id`.
- **Warehouse structure UI:** expandable `Warehouse → Aisle → Bay → Layer → Space` tree (`src/components/warehouse/warehouse-structure-tree.tsx`), warehouse detail popup view, storage-space creation with `layerId` picker.
- **Service-layer refactor:** shared guards in `src/services/helpers/common.ts`, shared pagination helper in `src/lib/api/pagination.ts`, dedicated `user.repository.ts` / `user.service.ts`, slimmer aisle/bay/layer/storage-space/warehouse/dashboard services.
- **Dashboard / Overview fixes:** scrollbar moved to the rightmost edge, capacity calculations via `dashboard.repository.ts`.
- **Admin users API:** `GET /api/admin/users` now supports search/filter/pagination (`requirePermission("USER_MANAGE")`).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js `16.3.5` App Router, React `19.2.8` |
| Language | TypeScript `^5` (strict, `@/*` → `./src/*`) |
| Database | PostgreSQL `17` (Docker), `pg` + `drizzle-orm ^0.45.2` |
| Migrations | `drizzle-kit ^0.31.10`, SQL in `src/db/migrations/` |
| Validation | `zod ^4.6.5` (`src/lib/validators/`) |
| Auth crypto | `bcryptjs`, `SALT_ROUNDS=12` |
| Decimal math | `decimal.js` (quantities are `NUMERIC(12,3)`, handled as strings) |
| Styling | `tailwindcss ^4`, `clsx`, `tailwind-merge`, `lucide-react` |
| Tests | `vitest ^5` (`tests/`) |
| Runtime / package manager | Node 20+, `pnpm@10.34.5` |
| Fonts | Self-hosted Geist via `next/font/local` (no Google Fonts at runtime) |

No Redis, queue, cache, object storage, or external auth provider. No Dockerfile / CI / Terraform in the repo.

## Features

- **Dashboard overview** (`/`): summary counts, per-warehouse capacity %, low-capacity alerts (≥75%), recent activity.
- **Warehouses + hierarchy:** CRUD for warehouses, aisles, bays, layers; nested routes (`/api/warehouses/:id/aisles`, `/api/aisles/:id/bays`, `/api/bays/:id/layers`); structure-tree browser; deactivate/delete blocked when subtree holds inventory.
- **Storage spaces:** dual-parent create (`layerId` required, `warehouseId` derived/validated), capacity-shrink guard, `location-path` and `inventory` sub-resources, storage-type picker.
- **Items catalog:** SKU-unique catalog, CSV import/export (all-or-nothing import, `2 MB` / `1000` rows import, `50k` rows export caps), delete blocked when allocated.
- **Inventory operations (transactional, with `inventory_movements` ledger):**
  - `POST /api/allocations` — split-fill allocate across eligible spaces (`SELECT … FOR UPDATE`, all-or-nothing).
  - `POST /api/transfers` — atomic move between spaces.
  - `POST /api/releases` — atomic release from a space.
- **Activity log** (`/activity`, `GET /api/inventory-movements`): filtered/paginated `ALLOCATE | MOVE | RELEASE` ledger reads.
- **Admin users** (`/admin/users`, ADMIN-only): list/update users, last-active-admin guard, deactivation kills sessions.
- **Auth:** DB-backed sessions (`sessions` table + `warehouse_session` HttpOnly cookie, 24h expiry), `ADMIN | STAFF` roles. Registration always creates `STAFF` — the first `ADMIN` must be promoted directly in the DB.
- **Theme:** `light | dark | system`, localStorage + blocking init script (no light-flash), header toggle.
- **Search / filter / pagination** on list pages and list APIs (`{ data, pagination }` envelope; empty querystring returns unpaged `{ data }` for dropdowns).

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- Docker with Docker Compose

## Getting started

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd warehouse-management
git checkout V3
pnpm install --frozen-lockfile
```

Start the PostgreSQL database:

```bash
docker compose up -d db
```

Create a `.env.local` file in the project root (V3 coordinates):

```env
DATABASE_URL=postgresql://warehouse2:warehouse2@localhost:5433/warehouse2
```

Apply the database migrations:

```bash
pnpm migrate
```

If you have pre-hierarchy data (spaces with `layer_id IS NULL`), run the Step-2 backfill:

```bash
node scripts/backfill-physical-hierarchy.mjs
# or: DATABASE_URL=... node scripts/backfill-physical-hierarchy.mjs
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Register an account, then sign in.

> Note: `next.config.ts` sets `allowedDevOrigins: ['10.0.1.228']` for network-device dev access.

## Roles and first admin

- `ADMIN`: full access, including warehouse/space/item deletes and `USER_MANAGE`.
- `STAFF`: everything except `WAREHOUSE_DELETE`, `STORAGE_SPACE_DELETE`, `ITEM_DELETE`, `USER_MANAGE`.
- `POST /api/auth/register` always creates a `STAFF` user. Promote the first admin directly in Postgres, e.g.:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Deactivating a user (`PATCH /api/admin/users/:id`) revokes all of their sessions.

## Available commands

```bash
pnpm dev          # Start the development server (:3000)
pnpm build        # Create a production build
pnpm start        # Start the production server
pnpm typecheck    # Run the TypeScript compiler
pnpm lint         # Run ESLint
pnpm test         # Run the test suite (vitest)
pnpm migrate      # Apply pending Drizzle migrations
pnpm generate     # Generate a new Drizzle migration
pnpm studio       # Open Drizzle Studio
```

## Database

The V3 Docker Compose PostgreSQL service uses:

- Image: `postgres:17`, container: `warehouse-db2`
- Database: `warehouse2`
- User: `warehouse2`
- Password: `warehouse2`
- Host port: `5433` (container `5432`)
- Volume: `warehouse_postgres_data2`

Stop the database container with:

```bash
docker compose down
```

`.env` / `.env.local` are gitignored and must be created separately on each machine. `drizzle.config.ts` reads `.env.local` then `.env`, falling back to `postgresql://warehouse:warehouse@localhost:5434/warehouse` only when `DATABASE_URL` is unset.

### Tables (V3)

`users`, `sessions`, `warehouses`, `aisles`, `bays`, `layers`, `storage_spaces`, `items`, `allocations`, `inventory_movements`.

Key notes:

- There is **no denormalized stock column** — totals are always `SUM(allocations.quantity)`.
- `quantity` / `capacity` are `NUMERIC(12,3)` and surface as **strings**; use `decimal.js` helpers in `src/lib/inventory/decimal.ts`, never `Number` math.
- Every allocate/move/release writes an `inventory_movements` row in the same DB transaction.

## Project structure (V3)

```text
src/
├── app/
│   ├── layout.tsx                  # Root layout (Geist fonts, theme script/provider)
│   ├── (auth)/login, register/     # Public pages (fetch JSON API)
│   ├── (dashboard)/                # Authed layout gate + Overview, Warehouses,
│   │                               # Items, Storage Spaces, Allocate, Transfer,
│   │                               # Release, Activity, Admin Users
│   └── api/                        # JSON route handlers: auth, warehouses, aisles,
│                                   # bays, layers, storage-spaces, items,
│                                   # allocations, transfers, releases,
│                                   # inventory-movements, dashboard, admin/users
├── components/layout/              # App shell, sidebar, header, navigation.ts
├── components/warehouse/           # warehouse-structure-tree.tsx (V3)
├── db/schema/                      # 10 Drizzle tables + enums (source of truth)
├── db/migrations/                  # 0000, 0001, 0002 (+ meta journal)
├── lib/auth/                       # session, auth, authorization (ADMIN/STAFF), password
├── lib/validators/                 # Zod schemas (incl. aisle/bay/layer/user in V3)
├── lib/inventory/                  # capacity, decimal, location-path (V3), storage-type
├── lib/api/                        # error-response, pagination (V3), list-query
├── repositories/                   # Drizzle queries only (aisle/bay/layer/user new in V3)
├── services/                       # Business rules + transactions (+ helpers/common.ts in V3)
└── types/                          # DTOs (aisle/bay/layer/user new in V3)
tests/                              # unit + integration + concurrency (vitest)
scripts/backfill-physical-hierarchy.mjs  # Step-2 hierarchy backfill (V3)
```

## API overview

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Warehouses | `GET/POST /api/warehouses`, `GET/PATCH/DELETE /api/warehouses/:id`, `GET/POST /api/warehouses/:id/aisles` |
| Aisles | `GET/PATCH/DELETE /api/aisles/:id`, `GET/POST /api/aisles/:id/bays` |
| Bays | `GET/PATCH/DELETE /api/bays/:id`, `GET/POST /api/bays/:id/layers` |
| Layers | `GET/PATCH/DELETE /api/layers/:id` |
| Storage spaces | `GET/POST /api/storage-spaces`, `GET/PATCH/DELETE /api/storage-spaces/:id`, `GET /:id/location-path`, `GET /:id/inventory`, `GET /api/warehouses/:id/storage-spaces` |
| Items | `GET/POST /api/items`, `GET/PATCH/DELETE /api/items/:id`, `GET /api/items/:id/allocations`, `GET /api/items/export`, `POST /api/items/import` |
| Inventory | `POST /api/allocations`, `POST /api/transfers`, `POST /api/releases`, `GET /api/inventory-movements` |
| Dashboard | `GET /api/dashboard` |
| Admin | `GET /api/admin/users`, `PATCH /api/admin/users/:id` (ADMIN only) |

Auth is enforced per-layout/per-handler (`requireAuth` / `requireRole` / `requirePermission`) — there is no middleware.

## Testing

```bash
pnpm test
```

- `tests/unit/` — pure functions, no DB.
- `tests/integration/` — live HTTP against `TEST_BASE_URL` (defaults to `:3000`, auto-spawns `next dev --port 3100` if unreachable) plus direct `pg` probes; uses `RUN_ID`-suffixed codes/SKUs on the shared DB.
- `tests/concurrency/` — parallel allocation/transfer races (no over-allocate, no deadlock).

## Production

```bash
pnpm install --frozen-lockfile
pnpm migrate
node scripts/backfill-physical-hierarchy.mjs  # only if upgrading pre-hierarchy data
pnpm build
pnpm start
```

The production server uses `http://localhost:3000` by default. Cookie `Secure` flag is enabled when `NODE_ENV=production`.

## Further reading

- `AGENTS.md` / `CLAUDE.md` — repo working agreements.
- Entry path: `package.json` → `src/db/schema/index.ts` → `src/db/index.ts` → `src/lib/auth/session.ts` + `authorization.ts` → `src/services/allocation.service.ts` → `src/app/api/allocations/route.ts` → `src/app/(dashboard)/allocations/page.tsx`.
