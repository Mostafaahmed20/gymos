# GymOS SaaS (Multi-Tenant Foundation)

This repository now includes a **REST + Prisma multi-tenant SaaS foundation** for gym management.

## Architecture
- **Frontend**: React responsive SaaS pages (`/saas`, `/saas/pricing`, `/saas/login`, `/saas/dashboard`)
- **Backend**: Express REST API in `server/saas`
- **Main platform database**: PostgreSQL + Prisma schema in `prisma/schema.prisma`
- **Tenant databases**: MongoDB database per gym, managed by `server/saas/services/tenant-database.ts`
- **Tenant isolation**: `gymId`, license status, and tenant Mongo database are resolved in middleware

## Multi-Tenant Strategy
- Main platform data remains in Prisma/PostgreSQL.
- Each gym receives a deterministic MongoDB database name such as `gymos_alpha_<id>_db`.
- New owner signup bootstraps tenant collections, indexes, default settings, and categories.
- Tenant middleware resolves gym from:
  - authenticated user `gymId`
  - `x-gym-id`
  - subdomain slug (`<slug>.platform.com`)
- Cross-tenant access is blocked.
- Expired or inactive gym licenses receive a renewal message and tenant APIs are disabled.

## Roles
- `OWNER`
- `MANAGER`
- `RECEPTIONIST`
- `COACH`
- `SUPER_ADMIN`

## SaaS Logic Included
- 30-day trial defaults on owner signup
- Plans: `BASIC`, `PRO`, `ENTERPRISE`
- Basic feature limit enforcement (max members)
- Gym status and subscription lifecycle models
- Tenant Mongo database bootstrap on gym creation
- License/subscription gate for tenant API access

## REST API Base
`/api/v1`

### Core endpoints
- `POST /auth/register-owner`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /gyms/me`
- `PATCH /gyms/me`
- `PATCH /gyms/subscription`
- `GET /dashboard/stats`
- `GET/POST/PATCH/DELETE /members`
- `GET/POST /memberships`
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET/POST /payments`
- `GET /reports/revenue`
- `GET/PATCH /super-admin/gyms`
- `GET /super-admin/analytics`

## Run SaaS API
1. Set env values (see `.env.example`)
2. Generate Prisma client:
   - `pnpm prisma:generate`
3. Run migrations:
   - `pnpm prisma:migrate`
4. Start API:
   - `pnpm dev:saas`

## Deployment
### Railway (Backend)
- Service root: repo root
- Start command: `pnpm start:saas`
- Build command: `pnpm build:saas && pnpm prisma:deploy`
- Env: `DATABASE_URL`, JWT secrets, tenant configs

### Vercel (Frontend)
- Build command: existing frontend build
- Optional: point API calls to Railway URL via frontend env variable

## Notes
- Existing legacy tRPC/Mongo app remains intact.
- This SaaS foundation is designed to scale and can be extended with AI workout/diet recommendation services.
