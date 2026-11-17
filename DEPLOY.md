# Deploying TeamPulse

The project is four services, so it goes on two hosts:

| Piece | Where | Why |
|---|---|---|
| `frontend/` (Next.js) | Vercel | built for Next.js, free HTTPS, previews |
| `backend/` (FastAPI) | Railway | Docker, always on |
| Postgres + Redis | Railway plugins | one click, private network |
| `ai-service/` | Railway | needs the Groq key, optional |

Vercel only runs the Next.js app. It cannot run FastAPI, Postgres or Redis, so the
API has to live somewhere else. Both hosts read straight from GitHub, so a push
redeploys.

---

## 1. Backend on Railway

1. **New Project → Deploy from GitHub repo** → pick `TeamPulse`.
2. Open the service → **Settings → Source**:
   - Root Directory: `backend`
   - Dockerfile Path: `Dockerfile.prod`
3. **Settings → Networking → Generate Domain**. Copy it, e.g.
   `https://teampulse-api-production.up.railway.app`.
4. In the project click **Create → Database → PostgreSQL**, then again for **Redis**.
5. Back on the backend service → **Variables → Raw Editor**, paste:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SECRET_KEY=<run: openssl rand -hex 32>
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://<your-app>.vercel.app
CORS_ORIGINS=["https://<your-app>.vercel.app"]
AI_SERVICE_URL=http://ai-service.railway.internal:8000
GOOGLE_CLIENT_ID=<same as local>
GOOGLE_CLIENT_SECRET=<same as local>
GITHUB_CLIENT_ID=<same as local>
GITHUB_CLIENT_SECRET=<same as local>
```

`CORS_ORIGINS` is read as JSON, so keep the quotes and brackets. No trailing slash.

6. **Optional AI service:** add another service from the same repo with Root
   Directory `ai-service`, Dockerfile `Dockerfile.prod`, variable
   `GROQ_API_KEY=<your key>`. Then set `AI_SERVICE_URL` on the backend to that
   service's private URL.

7. **Seed the demo data once.** Open the backend service → **Shell**:

```bash
python scripts/seed.py
```

That creates the four demo accounts (`john@teampulse.demo` / `Demo@12345`, etc.).

---

## 2. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the GitHub repo.
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (build `npm run build`, output `.next`)
3. **Environment Variables** (Production + Preview):

```
NEXT_PUBLIC_API_URL=https://<backend-domain>
NEXT_PUBLIC_WS_URL=wss://<backend-domain>
BACKEND_INTERNAL_URL=https://<backend-domain>
NEXTAUTH_URL=https://<your-app>.vercel.app
NEXTAUTH_SECRET=<run: openssl rand -hex 32>
GOOGLE_CLIENT_ID=<same as local>
GOOGLE_CLIENT_SECRET=<same as local>
GITHUB_CLIENT_ID=<same as local>
GITHUB_CLIENT_SECRET=<same as local>
```

`NEXT_PUBLIC_*` values are baked in at build time. If you change one, redeploy —
restarting is not enough.

4. Deploy, then copy the real domain (e.g. `https://teampulse.vercel.app`) and
   update `FRONTEND_URL`, `CORS_ORIGINS` and `NEXTAUTH_URL` to match exactly.

---

## 3. OAuth callbacks

Add the production URLs next to the localhost ones (keep both, so local dev
still works).

**Google** — console.cloud.google.com → APIs & Services → Credentials → your
OAuth client:

```
Authorized JavaScript origins: https://<your-app>.vercel.app
Authorized redirect URIs:    https://<your-app>.vercel.app/api/auth/callback/google
```

**GitHub** — github.com/settings/developers → your OAuth app:

```
Homepage URL:               https://<your-app>.vercel.app
Authorization callback URL: https://<your-app>.vercel.app/api/auth/callback/github
```

If the Google app is still in *Testing* mode, add your Gmail under **OAuth
consent screen → Test users**, otherwise Google returns "Access blocked".

---

## 4. What to check after the first deploy

- `https://<backend-domain>/health` returns `{"status":"ok", ...}`.
- Login with a seeded account lands on `/dashboard`.
- A team page shows task counts, and the board drags cards between columns.
- Browser devtools → Network → WS shows `wss://<backend-domain>/api/v1/ws/...`
  connected (101 Switching Protocols).

## Common errors

| Symptom | Cause |
|---|---|
| `blocked by CORS policy` | `CORS_ORIGINS` is missing the exact frontend origin, or is not a JSON array |
| 500 on `/auth/login` | `SECRET_KEY` not set |
| `UntrustedHost` | `trustHost: true` missing in `frontend/src/lib/auth.ts` |
| WebSocket fails only in prod | `NEXT_PUBLIC_WS_URL` is `ws://` instead of `wss://`, or set after the build |
| `Invalid connection option "sslmode"` | already handled — `database_url()` rewrites it for asyncpg |
| OAuth login returns to `/login?error=...` | callback URL in Google/GitHub does not match the deployed domain |

Cookies are not shared between `vercel.app` and `railway.app` (different sites),
which is why the API also accepts the `Authorization: Bearer` header from the
NextAuth session.
