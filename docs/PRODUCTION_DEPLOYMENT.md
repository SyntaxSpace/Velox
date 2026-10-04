# Velox Production Deployment

This guide prepares the existing Velox API, Socket.IO gateway, Next.js frontend, and Prisma database for a first production release. It does not configure PhonePe or install the Windows Agent.

## Services and requirements

- Supabase PostgreSQL for production data.
- A private Supabase Storage bucket for temporary print documents.
- A long-running Node.js or Docker host for the Express API and Socket.IO gateway. Do not run the gateway as a short-lived serverless function.
- Supabase Storage keeps print documents available across backend restarts and Render Free spin-downs; the backend removes them after processing.
- A Vercel project for the Next.js frontend.
- HTTPS for the public frontend and API. The API host must forward WebSocket connections to the same backend process.

Keep the first backend deployment to one instance. Multiple instances need coordinated Socket.IO delivery before they can safely serve the same shops.

## Supabase Storage

1. In the Supabase Dashboard, open **Storage** and create a bucket named `velox-print-documents`.
2. Keep the bucket **private**. Do not add public access policies; the Express API uses its server-only secret key after checking the Agent's shop authorization.
3. Restrict allowed content types to `application/pdf`, `image/png`, and `image/jpeg`, and set the bucket file-size limit to `50 MB` (or lower). The Render template caps each upload at 45 MiB so it stays below the Supabase Free limit.
4. In the project's API Keys settings, create a server secret key. Add the project URL and secret key only to Render's environment settings. Never put the secret key in Vercel, a `NEXT_PUBLIC_*` variable, the Windows Agent, or source control.

The backend stores only a random object key in the `OrderFile` record. It does not create public or signed URLs. The Windows Agent downloads through the existing authenticated API endpoint, which verifies the Agent's shop association and returns the checksum header. Completed/cancelled files are removed by the backend cleanup job.

## Supabase database

1. Create a Supabase project for production in the region nearest the backend host. Store the database password in the backend host's secret manager.
2. Copy connection strings from the Supabase **Connect** dialog. Do not construct pooler hostnames manually.
3. Configure `DATABASE_URL` for the backend runtime and `DIRECT_URL` for Prisma migrations. For a long-running API host with IPv6 access, use the direct connection for both. If the host or migration runner is IPv4-only, use Supabase's **Session pooler** connection on port `5432`. Keep the two values identical until separate runtime and migration paths are needed.
4. Use the shared transaction pooler only for a serverless runtime that requires it. This Velox backend keeps a persistent Socket.IO process, so a long-running host is the intended setup.
5. Run the checked-in migrations from the repository root after setting `DATABASE_URL` and `DIRECT_URL` in the backend process environment:

   ```sh
   npm run db:migrate:deploy
   ```

   This creates and secures the schema; it does not copy records from the local development database. The latest migration enables row-level security on every application table. The API connects with the private PostgreSQL credentials; no Supabase `anon` key, `service_role` key, or database URL belongs in the browser bundle.

## Backend host

From the repository root, build the API image:

```sh
docker build -f backend/Dockerfile -t velox-backend backend
```

Configure these backend environment variables in the host's secret/settings panel:

| Variable                  | Production value                                                              |
| ------------------------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`                | `production`                                                                  |
| `PORT`                    | The port supplied by the host                                                 |
| `HOST`                    | Bind address supplied by the host; Render uses `0.0.0.0`                      |
| `DATABASE_URL`            | Supabase runtime connection string                                            |
| `DIRECT_URL`              | Supabase migration connection string                                          |
| `JWT_SECRET`              | Unique cryptographically random secret, at least 32 characters                |
| `JWT_REFRESH_SECRET`      | A different random secret, at least 32 characters                             |
| `CORS_ORIGIN`             | Exact HTTPS frontend origins, comma-separated if needed; no paths or wildcard |
| `UPLOAD_STORAGE`          | `supabase`                                                                    |
| `SUPABASE_URL`            | Supabase project URL                                                          |
| `SUPABASE_SECRET_KEY`     | Server-only Supabase secret key                                               |
| `SUPABASE_STORAGE_BUCKET` | `velox-print-documents`                                                       |
| `UPLOAD_MAX_SIZE`         | `47185920` (45 MiB; below the Supabase Free per-file limit)                   |
| `UPLOAD_DIR`              | Unused in Supabase mode; keep `/app/uploads` for local-disk configuration     |

The server rejects production startup when the JWT secrets are short or identical, or when an allowed origin is not an exact HTTPS origin. Keep both JWT values private and independent. Do not expose database or JWT variables through `NEXT_PUBLIC_*` variables.

The container runs as the unprivileged `node` user. In Supabase mode uploaded files are held in memory while transferring to/from Storage, so keep the 45 MiB limit and use the Free host for low-volume demos only. Use the API health endpoint as the host's readiness check:

```text
https://<api-host>/api/v1/health
```

In production it returns `200` only when PostgreSQL responds; otherwise it returns `503`. Check that the response reports `database: connected` and `agentGateway: running` before sending users to the frontend.

### Render (selected backend host)

The repository-root `render.yaml` defines a free Render web service for the Docker image in Singapore with `/api/v1/health` readiness checks and Supabase Storage enabled. Free web services cannot attach persistent disks, which is why production uploads use the external private bucket. The API may spin down after inactivity and may restart; Supabase keeps uploaded documents, but the Agent and API may need to reconnect before a demo print can proceed.

After the updated `render.yaml` is pushed to GitHub, create/update the Blueprint in Render and confirm the plan is `Free` with no disk attached. Provide the Supabase session-pooler connection string for `DATABASE_URL`, the migration connection string for `DIRECT_URL`, the exact HTTPS Vercel origin for `CORS_ORIGIN`, plus `SUPABASE_URL` and a newly generated `SUPABASE_SECRET_KEY`. Keep the storage bucket name as `velox-print-documents`. Render generates separate JWT secrets from the Blueprint. Set `PORT` only if Render does not inject it for the service; the app binds to `0.0.0.0` on that port. Before deploying, review Render's included usage limits and billing settings; free services can be suspended at their limits, and usage overages can be billable when a payment method is on file.

The Docker image does not run database migrations during deploy. Apply migrations from a trusted terminal with the repository's `npm run db:migrate:deploy` command and production database environment before releasing code that depends on a schema change. This avoids starting the API against an unapplied migration and keeps Prisma CLI tooling out of the runtime image.

## First partner account

The demo seed contains known development accounts and refuses to run unless `NODE_ENV=development`. Do not run `npm run db:seed` against production.

After applying migrations, run the one-time production bootstrap from a trusted terminal or controlled release job. Set `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, `BOOTSTRAP_PARTNER_NAME`, `BOOTSTRAP_PARTNER_EMAIL`, and a unique `BOOTSTRAP_PARTNER_PASSWORD` of at least 16 characters in that process environment, then run:

```sh
npm run db:bootstrap:partner
```

The command creates a `PARTNER` account with an Argon2id password hash and refuses to run if any partner or admin already exists. Remove the temporary bootstrap password from the process environment after it completes. Create the production shop through the partner dashboard; do not seed the demo shop into production.

## Vercel frontend

Create a Vercel project from the Velox repository and set its **Root Directory** to `frontend`. Keep the repository's root npm lockfile and workspace configuration available to the build.

Set these variables for the Vercel Production environment, then redeploy:

| Variable                 | Value                       |
| ------------------------ | --------------------------- |
| `NEXT_PUBLIC_API_URL`    | `https://<api-host>/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<api-host>`        |

`NEXT_PUBLIC_*` values are embedded during the frontend build, so changing one requires a new deployment. Add the exact frontend origin to backend `CORS_ORIGIN`. Keep the API and Socket.IO URLs on the same backend host.
QR codes and onboarding links use the deployed browser origin (`window.location.origin`); configure the intended production domain in Vercel before generating them.

## Windows Agent connection

The current Agent already supports environment overrides. For a shop PC, configure `VELOX_Agent__ApiUrl` as `https://<api-host>` and `VELOX_Agent__WsUrl` as `https://<api-host>/agent`, along with that device's shop ID, device ID, and device key. Keep the device key on the shop PC; do not put it in the frontend or this repository. The existing local `appsettings.json` values remain pointed at localhost for development.

## Release checks

1. Apply all migrations to the production Supabase project and verify the tables are present with RLS enabled. The current Supabase project already has all checked-in migrations applied.
2. Bootstrap the first partner, then sign in and create one production shop.
3. Confirm the API health response, HTTPS REST requests, and a Socket.IO connection from the deployed frontend.
4. Upload a non-sensitive test PDF, verify it appears in the private bucket, verify the Agent downloads it through the authenticated API, then verify automatic bucket cleanup after completion/cancellation.
5. Restart the backend once while no print job is active and confirm the API, database status, and Agent reconnect successfully.

The Supabase project exists and all checked-in migrations are applied. The free Render service plus private Supabase Storage can support a low-volume real-printing demo, but cold starts/restarts and limited memory make it unsuitable for unattended production; upgrade hosting when reliability matters. The release still needs the private bucket, a Vercel project and production origin, production secrets configured in Render, and the first partner account. This milestone does not make online customer payments available; the existing development/counter payment flow remains in place.

## Local development

Keep using `backend/.env` with the local PostgreSQL URL for both `DATABASE_URL` and `DIRECT_URL`, `CORS_ORIGIN=http://localhost:3000`, `UPLOAD_STORAGE=local`, and `UPLOAD_DIR=./uploads`. Local uploads continue to use disk and do not require Supabase Storage credentials. The frontend continues to use its local `.env.local` values. Docker Compose remains the local PostgreSQL stack.
