'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'

/**
 * The theme lives on the user record so a new browser or laptop opens in the
 * same colours. next-themes keeps its own localStorage copy for instant paint;
 * this just lines the two up once the account loads.
 */
export function ThemeSync() {
  const { status } = useSession()
  const { setTheme } = useTheme()
  const applied = useRef(false)

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    if (applied.current || !data?.user) return
    applied.current = true
    if (data.user.theme) setTheme(data.user.theme)
  }, [data, setTheme])

  return null
}
