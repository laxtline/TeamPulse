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
    // Tell the API first (this clears its httpOnly cookies), but never let a
    // failing API call keep the user signed in locally.
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }

    clearTokenCache()

    // redirect:false + router.replace works from any dashboard page. The old
    // code relied on signOut's redirect while also racing a router.push, and
    // inside nested routes the session cookie sometimes survived.
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
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
