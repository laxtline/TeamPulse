import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { authApi } from '@/lib/api'

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
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    signOut({ callbackUrl: '/login', redirect: true })
  }, [])

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