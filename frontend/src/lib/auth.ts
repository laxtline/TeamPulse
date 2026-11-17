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

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    })

    if (!response.ok) throw new Error('Refresh failed')

    const data = await response.json()
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      error: undefined,
    }
  } catch (error) {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
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

        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) return null

        const data = await response.json()
        return {
          id: userIdFromAccessToken(data.access_token) || email,
          email,
          name: email,
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
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.id = user.id
      }

      if (account?.provider === 'google' || account?.provider === 'github') {
        const response = await fetch(`${API_URL}/api/v1/auth/oauth/${account.provider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: account.provider,
            provider_user_id: account.providerAccountId,
            email: user?.email,
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
        }
      }

      // Access tokens live for 15 minutes, so grab a new one before it expires.
      const expiresAt = accessTokenExpiresAt(token.accessToken as string | undefined)
      if (expiresAt && Date.now() > expiresAt - 60_000) {
        return refreshAccessToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.user.id = token.id as string
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