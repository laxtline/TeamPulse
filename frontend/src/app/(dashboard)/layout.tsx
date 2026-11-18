'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-surface-500">Loading...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <Navbar />
      <main
        className={cn(
          'min-h-screen transition-all duration-200',
          'lg:pl-64'
        )}
      >
        <div className="pt-16 lg:pt-16">
          {children}
        </div>
      </main>
    </div>
  )
}