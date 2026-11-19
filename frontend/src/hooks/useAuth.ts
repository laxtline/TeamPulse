import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { authApi, clearTokenCache } from '@/lib/api'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = useCallback(
    (provider?: 'credentials' | 'google' | 'github', email?: string, password?: string) => {
      if (provider === 'credentials') {
        return signIn('credentials', {
          email,
          password,
          redirect: false,
          callbackUrl: '/dashboard',
        })
      }
      return signIn(provider, { callbackUrl: '/dashboard' })
    },
    []
  )

  const logout = useCallback(async () => {
    clearTokenCache()

    // Sign out locally FIRST. Waiting on the API used to freeze the button for
    // up to 25s whenever Render was cold or the database was down, which looked
    // like "Log out does nothing" from some pages.
    //
    // redirect:false + router.replace works from any dashboard page. The old
    // code relied on signOut's redirect while also racing a router.push, and
    // inside nested routes the session cookie sometimes survived.
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()

    // Best effort: revoke the refresh token server-side. Never block the UI on
    // it, and never let a failure keep the user signed in.
    authApi.logout().catch(() => {})
  }, [router])

  return {
    user: session?.user,
    accessToken: session?.accessToken,
    refreshToken: session?.refreshToken,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    login,
    logout,
  }
}
