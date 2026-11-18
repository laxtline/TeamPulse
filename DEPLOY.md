# Deploying TeamPulse

The project is four services, so it never fits on one host. Vercel runs Next.js
only; it can't run FastAPI, Postgres or Redis. The free split is:

| Piece | Host | Free plan | Notes |
|---|---|---|---|
| `frontend/` (Next.js) | Vercel | $0, no card | static + serverless |
| `backend/` (FastAPI) | Render | $0, no card | Docker, sleeps after 15 min |
| Postgres | Neon | $0, no card | 1 GB, does not expire |
| Redis | Upstash | $0, no card | 250 MB, TLS |
| `ai-service/` | not deployed | — | falls back to the local heuristic |

Vercel and Render both build from GitHub, so `git push` to `master` redeploys.

Total: $0. The one catch is that the API sleeps after 15 minutes without
traffic and needs about a minute to wake up. Step 7 deals with that.

Everything below is done in the browser except two commands: the seed and the
health check.

## The live deployment

| Piece | Host | URL |
|---|---|---|
| Frontend | Vercel | https://team-pulse-lilac.vercel.app |
| API | Render (`teampulse-api`) | https://teampulse-api-ep2v.onrender.com |
| AI service | Render (`teampulse-ai`) | https://teampulse-ai-trwr.onrender.com |
| Postgres | Neon (`teampulse`, `production`) | direct host, `ap-southeast-1` |
| Redis | Upstash (`teampulse-redis`) | TLS, `ap-southeast-1` |

Demo login: `arjun@teampulse.ac` / `Passcode@9938` (the other three seeded
accounts use the same password). Health checks:

```
GET https://teampulse-api-ep2v.onrender.com/health        # liveness
GET https://teampulse-api-ep2v.onrender.com/health/ready  # DB + Redis, 503 when down
GET https://teampulse-ai-trwr.onrender.com/health
```


---

# Step 0 — before you start

1. The repo is pushed to `https://github.com/laxtline/TeamPulse`, branch `master`.
2. Docker Desktop is running on your machine. Only used for the seed in step 4
   — free Render has no shell and no one-off jobs.
3. You have a text file open for pasting URLs (`DATABASE_URL`, `REDIS_URL`).
   They're easy to lose between dashboards.

---

# Step 1 — Postgres on Neon

1. [neon.tech](https://neon.tech) → sign in with GitHub → **New Project**.
2. Name `teampulse`, region **Singapore**, Postgres 16.
3. On the project dashboard open **Connect** and copy the connection string.
   Take the **direct** host, the one *without* `-pooler` in it:

```
postgresql://neondb_owner:AbCd1234@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Paste it into that text file unchanged. `app/core/database.py` adds the
`+asyncpg` driver and rewrites `sslmode=require` into the `ssl=require` that
asyncpg wants, so there's nothing to edit.

Neon's free plan is 1 GB and doesn't expire. It sleeps after 5 minutes idle, so
the first query after a break takes a second. That's fine — Render pings the
API, not the database.

---

# Step 2 — Redis on Upstash

Redis here is only used for the WebSocket pub/sub channel and the login rate
limiter, so a tiny free instance is enough.

1. [upstash.com](https://upstash.com) → sign in → **Create Database**.
2. Name `teampulse-redis`, region `ap-southeast-1`, type **Regional**,
   plan **Free**.
3. On the database page open **Redis Connect** (or **REST API**) and copy the
   **TLS** URL:

```
rediss://default:AQAAAA...@xxx-12345.upstash.io:6379
```

Free is 250 MB / 500K commands a month. The app uses one `SUBSCRIBE` plus the
rate limiter, so you'll be nowhere near it.

`app/core/redis.py` hands the URL straight to `redis.from_url()`, which speaks
`rediss://` without extra flags. Use the TLS URL, not the plain one — Upstash
rejects non-TLS connections.

If Render offers a free **Key Value** instance in your workspace (25 MB,
internal network) that works too: use its **Internal** address,
`redis://red-cxxxxx:6379`, and skip Upstash. Not every workspace has it, which
is why Upstash is the default here.

---

# Step 3 — the API on Render

1. [dashboard.render.com](https://dashboard.render.com) → sign in with GitHub
   → **New → Web Service** → connect `laxtline/TeamPulse`.
2. Fill the form exactly:

| Field | Value |
|---|---|
| Name | `teampulse-api` |
| Region | Singapore |
| Branch | `master` |
| Root Directory | `backend` |
| Runtime | **Docker** |
| Dockerfile Path | `./Dockerfile.prod` |
| Instance Type | **Free** |
| Health Check Path | `/health` |
| Auto-Deploy | Yes |

3. **Environment Variables** — one row at a time, Render doesn't parse pasted
   `KEY=value` blocks:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon direct string from step 1 |
| `REDIS_URL` | `rediss://` string from step 2 |
| `SECRET_KEY` | 64 random hex chars (command below) |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `FRONTEND_URL` | `https://team-pulse-lilac.vercel.app` |
| `CORS_ORIGINS` | `["https://team-pulse-lilac.vercel.app"]` |
| `GOOGLE_CLIENT_ID` | same as local |
| `GOOGLE_CLIENT_SECRET` | same as local |
| `GITHUB_CLIENT_ID` | same as local |
| `GITHUB_CLIENT_SECRET` | same as local |

Make the secret in PowerShell:

```powershell
-join (1..64 | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

Two of these are easy to get wrong:

- `CORS_ORIGINS` is a Pydantic `List[str]`, so it's parsed as JSON. Keep the
  brackets and double quotes, no trailing slash on the domain. Setting it
  replaces the localhost defaults from `config.py`, which is what you want.
- `DEBUG=false` is not optional. The engine is built with
  `echo=settings.DEBUG`, so `true` dumps every SQL statement into the Render
  log stream. It also turns off `/docs` in production, which is correct.

4. **Create Web Service**. The first build takes a few minutes. When it's done,
   open `https://teampulse-api-ep2v.onrender.com/health` — it should return
   `{"status":"ok", ...}`.

Leave the Google/GitHub client IDs off this service. They're only read by the
Next.js side; the API's `/auth/oauth/{provider}` endpoint takes the provider
id from NextAuth, not a client secret.

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
curl -X POST https://teampulse-api-ep2v.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@teampulse.ac","password":"Passcode@9938"}'
```

## 5. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `TeamPulse`.
2. Set **Root Directory** to `frontend`. Framework auto-detects as Next.js.
3. **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://teampulse-api-ep2v.onrender.com
NEXT_PUBLIC_WS_URL=wss://teampulse-api-ep2v.onrender.com
BACKEND_INTERNAL_URL=https://teampulse-api-ep2v.onrender.com
NEXTAUTH_URL=https://team-pulse-lilac.vercel.app
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
Authorized JavaScript origins: https://team-pulse-lilac.vercel.app
Authorized redirect URIs:    https://team-pulse-lilac.vercel.app/api/auth/callback/google
```

**GitHub** — github.com/settings/developers → your OAuth app:

```
Homepage URL:               https://team-pulse-lilac.vercel.app
Authorization callback URL: https://team-pulse-lilac.vercel.app/api/auth/callback/github
```

The Google app is in *Testing* mode, so add your Gmail under **OAuth consent
screen → Test users**, otherwise Google shows "Access blocked".

## 7. Stop it falling asleep

Free Render services sleep after 15 minutes with no traffic. The wake takes
about a minute, which looks bad if someone opens the link cold.

Two options:

- **Free pinger** — [cron-job.org](https://cron-job.org) or UptimeRobot, hit
  `https://teampulse-api-ep2v.onrender.com/health` every 10 minutes. Render gives
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

# Step 4 — seed the demo data

Free Render has no shell, so run the seed from your laptop and point it at
Neon. The backend image already has the dependencies, which is why this goes
through Docker and not a local venv.

```powershell
cd "D:\Projects\On Working Projects\TeamPulse\teampulse"
docker compose build backend
```

Then, on one line (backslash continuations don't work in PowerShell):

```powershell
docker compose run --rm --no-deps -e DATABASE_URL="postgresql://neondb_owner:AbCd1234@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" backend python scripts/seed.py
```

Paste the Neon URL as-is. The script imports the same `database_url()` helper,
so `sslmode=require` is handled here too. It calls `init_db()` first, so this
also creates the tables — no Alembic step needed. Success prints:

```
Seed data created successfully!

Demo accounts:
  admin@teampulse.ac / Passcode@9938
  arjun@teampulse.ac / Passcode@9938
  priya@teampulse.ac / Passcode@9938
  rohan@teampulse.ac / Passcode@9938
```

Check it from PowerShell:

```powershell
curl.exe -X POST https://teampulse-api.onrender.com/api/v1/auth/login -H "Content-Type: application/json" -d '{\"email\":\"arjun@teampulse.ac\",\"password\":\"Passcode@9938\"}'
```

`access_token` + `refresh_token` back means the API, Neon and the seed all
agree with each other.

---

# Step 5 — frontend on Vercel

Decide the production domain before you fill anything in. Vercel only gives you
`teampulse.vercel.app` if that name is still free — otherwise the project lands
on something like `teampulse-two.vercel.app`. That exact host has to be used in
four places or the deploy half-works: `NEXTAUTH_URL` here, `CORS_ORIGINS` and
`FRONTEND_URL` on Render, and both OAuth callback URLs. Fixing it later means
editing all four again.

1. [vercel.com](https://vercel.com) → **Add New → Project** → import
   `TeamPulse`.
2. **Root Directory** → `frontend`. Framework auto-detects as Next.js.
3. **Environment Variables** (Production; add to Preview only if you use it):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://teampulse-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://teampulse-api.onrender.com` |
| `BACKEND_INTERNAL_URL` | `https://teampulse-api.onrender.com` |
| `NEXTAUTH_URL` | `https://teampulse.vercel.app` |
| `NEXTAUTH_SECRET` | another 64 hex chars, different from `SECRET_KEY` |
| `GOOGLE_CLIENT_ID` | same as local |
| `GOOGLE_CLIENT_SECRET` | same as local |
| `GITHUB_CLIENT_ID` | same as local |
| `GITHUB_CLIENT_SECRET` | same as local |

No trailing slashes. `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` get
interpolated into the `connect-src` CSP in `next.config.js` and into the socket
URL in `useWebSocket.ts`, and a stray slash makes both strings wrong.

4. **Deploy**. When you change any `NEXT_PUBLIC_*` value later you have to
   redeploy, not restart — they're inlined into the JS bundle at build time.

`NEXTAUTH_URL` is fixed to the production domain on purpose. Preview
deployments get a random `*.vercel.app` host, so auth won't work on previews;
if you care, add that host to Google/GitHub as well.

---

# Step 6 — OAuth callbacks

The callback goes to Vercel, not Render, because NextAuth handles the exchange
server-side and then calls `/api/v1/auth/oauth/{provider}` with a Bearer token.
Add the production URLs next to the localhost ones and keep both:

**Google** — console.cloud.google.com → APIs & Services → Credentials → your
OAuth client:

```
Authorized JavaScript origins: https://team-pulse-lilac.vercel.app
Authorized redirect URIs:    https://team-pulse-lilac.vercel.app/api/auth/callback/google
```

**GitHub** — github.com/settings/developers → your OAuth app:

```
Homepage URL:               https://team-pulse-lilac.vercel.app
Authorization callback URL: https://team-pulse-lilac.vercel.app/api/auth/callback/github
```

The Google app is in *Testing* mode, so add your Gmail under **OAuth consent
screen → Test users**, otherwise Google shows "Access blocked".

---

# Step 7 — stop it falling asleep

Free Render spins a web service down after 15 minutes with no inbound traffic,
and the wake costs about a minute. That looks bad when someone opens the link
cold.

1. [cron-job.org](https://cron-job.org) → free account → **Create cronjob**:
   - URL: `https://teampulse-api.onrender.com/health`
   - Schedule: every 10 minutes
   - Save, enable it, then **TEST RUN** once.
2. Respect the budget. Render gives 750 instance hours per workspace per month;
   one always-on service burns about 730. That leaves nothing spare, so don't
   also keep the AI service awake. Services that are spun down don't count.

Alternative: skip the pinger and open the site two minutes before an
interview. The frontend loads instantly from Vercel while the API wakes behind
it.

---

# Step 8 — check the deploy

In this order, because each one depends on the previous:

1. `https://teampulse-api.onrender.com/health` → `{"status":"ok", ...}`
2. `https://teampulse-api.onrender.com/docs` → **404**. Correct; `DEBUG=false`
   disables it.
3. Vercel site → log in as `arjun@teampulse.ac` / `Passcode@9938` → lands on
   `/dashboard`.
4. Team page shows 26 tasks. Drag a card to another column, reload — the move
   stuck.
5. DevTools → Network → WS → `wss://teampulse-api.onrender.com/api/v1/ws/...`
   with status **101**.
6. Log in as `priya@teampulse.ac` in a second browser profile, drag a card in
   one window — the other updates without a reload. That's the Upstash pub/sub
   path doing its job.
7. Google and GitHub buttons come back to `/dashboard`.

If step 6 works but step 5 doesn't, it's almost always `NEXT_PUBLIC_WS_URL`
being `wss://` while the build still has the old value.

---

# Step 9 — clean up Railway

Once step 8 passes:

1. Railway project → **Settings → Danger** → delete the web service, Postgres
   and Redis. Don't leave them sitting on the trial credit.
2. Anything that pointed at Railway's Postgres is now pointing at Neon. That's
   the copy you keep.

---

# Other options

## Railway (paid, $5 trial)

Railway has no real free tier any more: $5 of credit for 30 days, then $1 a
month. Enough for one small API, not for the API plus two databases.

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
FRONTEND_URL=https://team-pulse-lilac.vercel.app
CORS_ORIGINS=["https://team-pulse-lilac.vercel.app"]
```

5. **Settings → Networking → Generate Domain**.
6. Service → **Shell** → `python scripts/seed.py` (paid plans have a shell).

Then do steps 5 and 6 above for the frontend and the OAuth callbacks.

## Google Cloud Run (free inside the quota)

Same `Dockerfile.prod` — it already binds to `$PORT`. 180k vCPU-seconds and 2M
requests a month, and cold starts are about 2 seconds instead of a minute.
Needs a billing account with a card on file, though it stays at $0 while
`min-instances=0`.

## Oracle Cloud Always Free (never sleeps)

The only free way to run the whole `docker-compose.yml` as-is, forever, with no
sleep. Ampere A1 Arm VM, 2 OCPU / 12 GB.

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

`frontend/Dockerfile` runs `npm run dev`, which you don't want on a public VM.
Build it once instead (`npm ci && npm run build && npm start`), or keep the
frontend on Vercel and only run the API here.

Oracle asks for a card to verify the account and reclaims idle instances, so
it's more setup than the Render path.

---

# Free host comparison (checked late 2026)

| Host | Free allowance | Card | Idle behaviour |
|---|---|---|---|
| **Render** | 750 instance h/month, 512 MB | no | sleeps after 15 min, ~60 s wake |
| **Upstash** | 250 MB, 500K commands/month | no | always on |
| **Vercel** | 100 GB bandwidth, hobby | no | static + serverless |
| **Neon** | 1 GB, no expiry | no | sleeps after 5 min idle |
| Zeabur | free plan, auto-sleep | no | sleeps |
| Back4App | 256 MB container | no | stops after 60 min |
| Koyeb | 1 service, 512 MB, 0.1 vCPU | $29 hold | sleeps after 1 h, ~5 s wake |
| Google Cloud Run | 180k vCPU-s, 2M requests | yes | scales to zero, ~2 s |
| Oracle Cloud | 2 OCPU / 12 GB Arm VM | yes | never |
| Railway | $5 for 30 days, then $1/month | no | opt-in |
| Fly.io | none since Oct 2024 | yes | — |

Render + Neon + Upstash is the shortest path that needs no card. If a
one-minute cold start is unacceptable, Cloud Run is the next step up, and the
Dockerfile is already compatible.

---

# Common errors

| Symptom | Cause |
|---|---|
| `blocked by CORS policy` | `CORS_ORIGINS` missing the exact origin, not a JSON array, or a `NEXT_PUBLIC_API_URL` change without a Vercel redeploy |
| `No open ports detected` on Render | Root Directory isn't `backend`, or the Dockerfile isn't `./Dockerfile.prod` |
| Service crashes on boot, `ConnectionError` | bad `REDIS_URL` — needs `rediss://` for Upstash, password included |
| 500 on `/auth/login` | `SECRET_KEY` missing |
| `UntrustedHost` | `trustHost: true` missing in `frontend/src/lib/auth.ts` |
| `Invalid connection option "sslmode"` | handled by `database_url()`; means that helper got edited |
| WebSocket fails only in prod | `NEXT_PUBLIC_WS_URL` must be `wss://`, set before the build |
| OAuth returns to `/login?error=...` | callback URL doesn't match the deployed domain |
| Tables missing / board empty | step 4 skipped, or seeded against the wrong `DATABASE_URL` |
| `429 Too Many Requests` while testing logins | login allows 5 tries per 5 minutes per client IP, and behind Render's proxy every visitor looks like the same IP. Wait it out instead of retrying |
| Everything 502 for a minute | cold start; the cron in step 7 prevents it |

Cookies aren't shared between `vercel.app` and `onrender.com` (different
sites), which is why the API also accepts the `Authorization: Bearer` header
from the NextAuth session. That's already wired up in
`frontend/src/lib/api.ts`.