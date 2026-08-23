# GymOS Production Deployment

GymOS is prepared for a permanent Docker deployment. The repository includes a multi-stage `Dockerfile`, a Render Blueprint in `render.yaml`, a production environment template, a health endpoint at `/api/v1/health`, and durable storage configuration for uploads.

## Recommended production topology

Run the GymOS web application as one Docker web service. Keep PostgreSQL in a managed PostgreSQL service and MongoDB tenant databases in MongoDB Atlas. The Render Blueprint mounts a persistent disk at `/app/uploads`; this preserves uploaded member and progress photos across container restarts and deployments.

| Component | Recommended service | Required configuration |
|---|---|---|
| Web application | Render Docker Web Service | Deploy from the `main` branch using `render.yaml` |
| Platform database | Managed PostgreSQL | Supply its TLS `DATABASE_URL` through encrypted environment variables |
| Tenant databases | MongoDB Atlas | Supply the Atlas URI as `SAAS_MONGODB_URI`; allow the deployed host's network access |
| Member photos | Render persistent disk | The supplied Blueprint mounts 1 GB at `/app/uploads` |
| Domain | Your registrar + Render custom domain | Point DNS only after the service health check is passing |

## Deploy with Render Blueprint

1. Push the current `main` branch to GitHub.
2. In Render, choose **New** → **Blueprint**, then connect `Mostafaahmed20/gymos`.
3. Render reads `render.yaml` and creates the Docker web service. Enter values for all variables marked as secret (`sync: false`). Render generates the JWT and QR signing secrets declared with `generateValue: true`.
4. Provide a production PostgreSQL connection string for `DATABASE_URL`. The database must be reachable from Render and should require TLS.
5. Provide the MongoDB Atlas URI as both `MONGODB_URI` and `SAAS_MONGODB_URI`. In Atlas, add the host's outbound network access as appropriate for your security policy.
6. Confirm the deployment. The Docker command applies pending Prisma migrations and starts GymOS. Verify `https://YOUR-SERVICE.onrender.com/api/v1/health` returns a JSON response with `status: "ok"`.
7. Add your custom domain in the Render service settings, then create the DNS records shown by Render at your domain registrar. Update `APP_BASE_DOMAIN`, `SAAS_CORS_ORIGIN`, and `VITE_AUTH_LOGIN_URL` to the final HTTPS domain, then redeploy.

## Required environment variables

Copy `.env.production.example` into your host's encrypted environment-variable configuration. Do not commit a real `.env` file. Generate separate, long random values for all JWT and QR secrets if your provider does not create them automatically.

## Production security checklist

- Rotate the MongoDB Atlas password that was previously placed in a development environment example. The template is now sanitized, but rotation invalidates any past exposure.
- Use a separate, least-privilege Atlas database user for GymOS production. Do not use an owner-level Atlas account.
- Restrict MongoDB Atlas network access to the hosting provider where possible. Do not keep `0.0.0.0/0` enabled after deployment if a narrower rule is available.
- Use a managed PostgreSQL database with TLS and daily backups.
- Change the seeded Super Admin password immediately after the first production login.
- Keep the Render persistent disk attached at `/app/uploads` so member photos survive redeployments.
- Configure a custom HTTPS domain before inviting real gyms or members.

## Post-deployment smoke test

Open the HTTPS service URL and verify Super Admin login, Gym Admin login, member QR check-in, member photo upload, workout and nutrition plan assignment, and the financial analytics dashboard. The supported browser routes are `/saas/login`, `/super-admin`, `/saas/dashboard`, and `/member-portal/login`.
