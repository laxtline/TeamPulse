import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { JWT } from 'next-auth/jwt'

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * NextAuth's callbacks run on the server, so they must reach the backend by its
 * service name inside Docker (`http://backend:8000`), not `localhost`.
 */
function userIdFromAccessToken(token?: string): string | undefined {
  if (!token) return undefined
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof json.sub === 'string' ? json.sub : undefined
  } catch {
    return undefined
  }
}

function accessTokenExpiresAt(token?: string): number | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * The API runs on a free Render instance that sleeps when idle. Waking it takes
 * up to a minute, so retry once with a generous timeout instead of letting the
 * whole sign-in fail the first time somebody logs in after a quiet spell.
 */
async function fetchBackend(
  path: string,
  init: RequestInit,
  attempts = 2,
  timeoutMs = 25_000
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(`${API_URL}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Backend unreachable')
}

/**
 * The backend revokes the old refresh token as soon as it hands out a new one,
 * so two session reads that refresh at the same moment would make the second
 * one fail and quietly sign the user out. Share a single request per token.
 */
const refreshesInFlight = new Map<string, Promise<JWT>>()

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const key = typeof token.refreshToken === 'string' ? token.refreshToken : ''
  if (!key) return { ...token, error: 'RefreshAccessTokenError' }

  const running = refreshesInFlight.get(key)
  if (running) return running

  const request = (async (): Promise<JWT> => {
    try {
      const response = await fetchBackend('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: token.refreshToken }),
      }, 1, 10_000)

      if (!response.ok) {
        // A 429 or a backend hiccup says nothing about the user's session.
        // Remember the attempt so the next session read waits instead of
        // hammering the endpoint into a permanent rate limit.
        const transient = response.status === 429 || response.status >= 500
        return {
          ...token,
          refreshFailedAt: Date.now(),
          error: transient ? token.error : 'RefreshAccessTokenError',
        }
      }

      const data = await response.json()
      return {
        ...token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        refreshFailedAt: undefined,
        error: undefined,
      }
    } catch {
      return { ...token, refreshFailedAt: Date.now() }
    } finally {
      refreshesInFlight.delete(key)
    }
  })()

  refreshesInFlight.set(key, request)
  return request
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = String(credentials.email)
        const password = String(credentials.password)

        const response = await fetchBackend('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }).catch(() => null)

        if (!response || !response.ok) return null

        const data = await response.json()

        // Pull the profile so the navbar shows the real name/avatar instead of
        // the email address.
        let profile: { full_name?: string; avatar_url?: string | null } = {}
        try {
          const meResponse = await fetchBackend('/api/v1/auth/me', {
            method: 'GET',
            headers: { Authorization: `Bearer ${data.access_token}` },
          })
          if (meResponse.ok) {
            const me = await meResponse.json()
            profile = me.user ?? {}
          }
        } catch {
          // Keep the login working even if this extra call fails.
        }

        return {
          id: userIdFromAccessToken(data.access_token) || email,
          email,
          name: profile.full_name || email,
          image: profile.avatar_url || undefined,
          full_name: profile.full_name || email,
          avatar_url: profile.avatar_url || null,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.id = user.id
        token.full_name = user.full_name || user.name || token.name
        token.avatar_url = user.avatar_url ?? user.image ?? null
        token.name = token.full_name as string
        token.picture = token.avatar_url as string | null
      }

      // useSession().update({ full_name, avatar_url }) after a profile edit.
      if (trigger === 'update' && session) {
        if (typeof session.full_name === 'string' && session.full_name.trim()) {
          token.full_name = session.full_name
          token.name = session.full_name
        }
        if (session.avatar_url !== undefined) {
          token.avatar_url = session.avatar_url || null
          token.picture = session.avatar_url || null
        }
      }

      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const response = await fetchBackend(`/api/v1/auth/oauth/${account.provider}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: account.provider,
              provider_user_id: account.providerAccountId,
              email: user?.email ?? token.email,
              full_name: user?.name || user?.email || 'TeamPulse User',
              avatar_url: user?.image ?? null,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            token.accessToken = data.access_token
            token.refreshToken = data.refresh_token
            token.id = userIdFromAccessToken(data.access_token) ?? token.id
          } else {
            // Keep the user signed in with the provider, but API calls will fail
            // loudly instead of silently pretending we have a backend session.
            console.error('Backend OAuth exchange failed:', response.status)
            token.error = 'BackendOAuthFailed'
          }
        } catch (error) {
          // Throwing here would bounce the user back to /login with a generic
          // "an error occurred"; keep the session and let the UI explain.
          console.error('Backend OAuth exchange did not complete:', error)
          token.error = 'BackendOAuthFailed'
        }
      }

      // Access tokens live for 15 minutes, so grab a new one before it expires.
      // If the last attempt failed, wait a few seconds first: retrying on every
      // session read is how the endpoint used to end up rate limited forever.
      const expiresAt = accessTokenExpiresAt(token.accessToken as string | undefined)
      const lastAttempt = typeof token.refreshFailedAt === 'number' ? token.refreshFailedAt : 0
      const backingOff = Date.now() - lastAttempt < 5_000
      if (expiresAt && Date.now() > expiresAt - 60_000 && !backingOff) {
        return refreshAccessToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.user.id = token.id as string
      session.user.full_name = (token.full_name as string | undefined) ?? session.user.name ?? null
      session.user.avatar_url = (token.avatar_url as string | null | undefined) ?? null
      session.user.name = session.user.full_name
      session.user.image = session.user.avatar_url
      // Surfaced so the UI can explain a failed backend handshake instead of
      // showing empty pages after an otherwise successful OAuth login.
      session.error = token.error as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Vercel and most reverse proxies forward the host header, which NextAuth
  // rejects unless we trust it.
  trustHost: true,
})