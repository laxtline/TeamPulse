import 'next-auth'
import 'next-auth/jwt'

// next-auth v5 re-exports Session/User from @auth/core, so the extra fields are
// declared on that module instead of the next-auth one.
declare module '@auth/core/types' {
  interface User {
    full_name?: string | null
    avatar_url?: string | null
    accessToken?: string
    refreshToken?: string
  }

  interface Session {
    accessToken?: string
    refreshToken?: string
    error?: string
    user: User & {
      id: string
      full_name?: string | null
      avatar_url?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    error?: string
    full_name?: string | null
    avatar_url?: string | null
  }
}
