# Deploying TeamPulse

The project is four services, so it never fits on one host. Vercel runs Next.js
only; it can't run FastAPI, Postgres or Redis. The split is:

| Piece | Host | Free? |
|---|---|---|
| `frontend/` (Next.js) | Vercel | yes, no card |
| `backend/` (FastAPI) | Render | yes, no card |
| Postgres | Neon | yes, no card |
| Redis | Render Key Value | yes, no card |
| `ai-service/` | Render (optional) | yes, no card |

Both Vercel and Render build straight from GitHub, so `git push` redeploys.

---

# Option A — the free stack (no credit card)

Total cost: $0. The only catch is the API sleeps after 15 minutes without
traffic and takes about a minute to wake up (see step 7).

## 1. Postgres on Neon

1. [neon.tech](https://neon.tech) → sign in with GitHub → **New Project**.
2. Name it `teampulse`, pick the region closest to you (Singapore for India).
3. On the project dashboard, open **Connect** and copy the connection string.
   Use the **direct** host, the one *without* `-pooler` in it:

```
postgresql://neondb_owner:xxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Keep that string, it goes into Render in step 3. Neon's free plan is 1 GB and
doesn't expire, but it sleeps after 5 minutes idle, so the first query after a
break takes a second.

## 2. Redis on Render

1. [dashboard.render.com](https://dashboard.render.com) → **New → Key Value**.
2. Name `teampulse-redis`, same region as the API will be, plan **Free**.
3. Copy the **Internal** connection string, it looks like
   `redis://red-cxxxxx:6379`.

Free Key Value is 25 MB and lives in memory, which is fine here: we only use it
for the WebSocket pub/sub channel and the login rate limiter.

If you'd rather use Upstash: create a free Redis database, copy its `rediss://`
URL, and use that as `REDIS_URL` instead. The free plan is 250 MB / 500K
commands a month.

## 3. API on Render

1. **New → Web Service** → connect GitHub → pick `TeamPulse`.
2. Fill the form:

| Field | Value |
|---|---|
| Name | `teampulse-api` |
| Region | same as the Key Value |
| Branch | `master` |
| Root Directory | `backend` |
| Runtime | Docker |
| Dockerfile Path | `./Dockerfile.prod` |
| Instance Type | Free |
| Health Check Path | `/health` |

3. **Environment Variables** — add these one by one:

```
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-...neon.tech/neondb?sslmode=require
REDIS_URL=redis://red-cxxxxx:6379
SECRET_KEY=<run: openssl rand -hex 32>
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://teampulse.vercel.app
CORS_ORIGINS=["https://teampulse.vercel.app"]
GOOGLE_CLIENT_ID=<same as local>
GOOGLE_CLIENT_SECRET=<same as local>
GITHUB_CLIENT_ID=<same as local>
GITHUB_CLIENT_SECRET=<same as local>
```

`CORS_ORIGINS` is parsed as JSON, so keep the quotes and the brackets. No
trailing slash. If the Vercel domain ends up different, come back and change it.

The database URL is written the way Neon gives it. `app/core/database.py` adds
the `+asyncpg` driver and turns `sslmode=require` into what asyncpg wants, so
paste it unchanged.

4. **Create Web Service**. The first build takes a few minutes. When it's done,
   open `https://teampulse-api.onrender.com/health` — it should return
   `{"status":"ok", ...}`.

## 4. Seed the demo data

Free Render instances have no shell, so run the seed from your laptop but point
it at Neon. The backend image already has the dependencies installed:

```bash
cd teampulse
docker compose run --rm --no-deps -e DATABASE_URL="postgresql+asyncpg://neondb_owner:xxxx@ep-...neon.tech/neondb?ssl=require" backend python scripts/seed.py
```

On PowerShell keep it on one line (backslash continuations don't work there), or
use a backtick at the end of the line instead.

That creates the four demo users, the Acme Corp team, three projects and 26
tasks. It creates the tables first, so you don't need to do anything else.

Check it worked:

```bash
curl -X POST https://teampulse-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@teampulse.ac","password":"Passcode@9938"}'
```

## 5. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `TeamPulse`.
2. Set **Root Directory** to `frontend`. Framework auto-detects as Next.js.
3. **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://teampulse-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://teampulse-api.onrender.com
BACKEND_INTERNAL_URL=https://teampulse-api.onrender.com
NEXTAUTH_URL=https://teampulse.vercel.app
NEXTAUTH_SECRET=<run: openssl rand -hex 32>
GOOGLE_CLIENT_ID=<same as local>
GOOGLE_CLIENT_SECRET=<same as local>
GITHUB_CLIENT_ID=<same as local>
GITHUB_CLIENT_SECRET=<same as local>
```

4. **Deploy**. `NEXT_PUBLIC_*` values are baked into the JS at build time, so if
   you change one you have to redeploy, a restart does nothing.

## 6. OAuth callbacks

Add the production URLs next to the localhost ones — keep both so local dev
still works.

**Google** — console.cloud.google.com → APIs & Services → Credentials → your
OAuth client:

```
Authorized JavaScript origins: https://teampulse.vercel.app
Authorized redirect URIs:    https://teampulse.vercel.app/api/auth/callback/google
```

**GitHub** — github.com/settings/developers → your OAuth app:

```
Homepage URL:               https://teampulse.vercel.app
Authorization callback URL: https://teampulse.vercel.app/api/auth/callback/github
```

The Google app is in *Testing* mode, so add your Gmail under **OAuth consent
screen → Test users**, otherwise Google shows "Access blocked".

## 7. Stop it falling asleep

Free Render services sleep after 15 minutes with no traffic. The wake takes
about a minute, which looks bad if someone opens the link cold.

Two options:

- **Free pinger** — [cron-job.org](https://cron-job.org) or UptimeRobot, hit
  `https://teampulse-api.onrender.com/health` every 10 minutes. Render gives
  750 instance hours a month, and one always-on service uses about 730, so it
  fits exactly. Don't also keep the AI service warm or you'll go over.
- **Just warm it up** — open the site 2 minutes before an interview. The
  frontend loads instantly from Vercel while the API wakes.

## 8. Optional: the AI service

Only needed if you want real Groq output instead of the built-in heuristic
fallback. Add a second **Web Service** from the same repo:

| Field | Value |
|---|---|
| Root Directory | `ai-service` |
| Dockerfile Path | `./Dockerfile.prod` |
| Instance Type | Free |

Variables: `GROQ_API_KEY=<your key>`, `GROQ_MODEL=llama-3.3-70b-versatile`.

Then set `AI_SERVICE_URL` on the API to the AI service's private address
(`http://<service-name>:8000`). Leave it unset and `AIService` quietly falls
back to counting completed tasks, which is what happens locally when the AI
container is down.

---

# Option B — Railway

Railway has no real free tier any more: $5 of credit for 30 days, then $1 a
month. That covers one small API for a while, but not Postgres too.

1. **New Project → Deploy from GitHub repo** → `TeamPulse`.
2. Service → **Settings → Source**: Root Directory `backend`, Dockerfile
   `Dockerfile.prod`.
3. **Create → Database → PostgreSQL**, then **Redis**.
4. Variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SECRET_KEY=<openssl rand -hex 32>
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://teampulse.vercel.app
CORS_ORIGINS=["https://teampulse.vercel.app"]
```

5. **Settings → Networking → Generate Domain**.
6. Service → **Shell** → `python scripts/seed.py` (paid plans have a shell).

Then do Option A steps 5 and 6 for the frontend and the OAuth callbacks.

---

# Option C — one small VM (Oracle Cloud Always Free)

The only way to get the whole `docker-compose.yml` running as-is, with no sleep
and no cold start. Oracle's Always Free Arm VM is currently 2 OCPU / 12 GB, and
the arm64 images for postgres, redis, python and node all exist.

1. Create an **Ampere A1** instance, Ubuntu 22.04, open ports 80/443.
2. `git clone`, copy `.env`, then `docker compose up -d`.
3. Put Caddy in front for HTTPS:

```
teampulse.example.com {
    reverse_proxy localhost:3000
}
api.example.com {
    reverse_proxy localhost:8000
}
```

One change is needed: `frontend/Dockerfile` runs `npm run dev`, which is not
something you want on a public VM. Build it once instead —
`npm ci && npm run build && npm start` — or keep Vercel for the frontend and
only run the API here.

Oracle asks for a card to verify the account and reclaims idle instances, so
it's more setup than Option A.

---

# Free host comparison (checked late 2026)

| Host | Free allowance | Card | Idle behaviour |
|---|---|---|---|
| **Render** | 1 web service, 512 MB, 750 h/month | no | sleeps after 15 min, ~1 min wake |
| **Koyeb** | 1 service, 512 MB, 0.1 vCPU | yes, $29 hold | sleeps after 1 h, 1–5 s wake |
| **Google Cloud Run** | 180k vCPU-s, 2M requests/month | yes | scales to zero, few seconds |
| **Oracle Cloud** | 2 OCPU / 12 GB Arm VM | yes | never |
| **Zeabur** | free plan, auto-sleep | no | sleeps |
| **Back4App** | 256 MB container | no | stops after 60 min |
| **Railway** | $5 for 30 days, then $1/month | no | opt-in |
| **Fly.io** | none since Oct 2024 | yes | — |

Render + Neon is the shortest path with no card. If a 1-minute cold start is
unacceptable, Cloud Run is the next step up and wakes in seconds — same
Dockerfile, since it also reads `PORT`.

---

# After the first deploy

- `https://<api>/health` → `{"status":"ok", ...}`
- Login with `arjun@teampulse.ac` / `Passcode@9938` → lands on `/dashboard`
- Team page shows 26 tasks, the board drags cards between columns
- DevTools → Network → WS: `wss://<api>/api/v1/ws/...` with **101**
- Google and GitHub buttons come back to `/dashboard`

# Common errors

| Symptom | Cause |
|---|---|
| `blocked by CORS policy` | `CORS_ORIGINS` missing the exact origin, or not a JSON array |
| `No open ports detected` on Render | the container didn't bind to `$PORT` — `Dockerfile.prod` handles this |
| 500 on `/auth/login` | `SECRET_KEY` not set |
| `UntrustedHost` | `trustHost: true` missing in `frontend/src/lib/auth.ts` |
| `Invalid connection option "sslmode"` | handled by `database_url()` in `app/core/database.py` |
| WebSocket fails only in prod | `NEXT_PUBLIC_WS_URL` must be `wss://` and set before the build |
| OAuth returns to `/login?error=...` | callback URL doesn't match the deployed domain |
| Tables missing | the seed step was skipped; `scripts/seed.py` creates them |

Cookies aren't shared between `vercel.app` and `onrender.com` (different sites),
which is why the API also accepts the `Authorization: Bearer` header from the
NextAuth session.
