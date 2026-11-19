'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const router = useRouter()
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)

  // `redirect()` from next/navigation only works on the server. Calling it
  // during a client render threw an error and left the page blank the moment a
  // logout cleared the session, so nudge the router from an effect instead.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-surface-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <Navbar />
      {/*
        The sidebar is position:fixed, so it is out of the document flow. The
        left padding here has to match its width exactly, otherwise content
        starts an extra sidebar-width to the right (the gap bug on desktop).
      */}
      <main
        className={cn(
          'min-h-screen pt-16 transition-[padding] duration-200',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'
        )}
      >
        {children}
      </main>
    </div>
  )
}
