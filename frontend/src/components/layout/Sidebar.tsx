'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Settings, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { useEffect } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { user, logout } = useAuth()

  const expanded = mobileSidebarOpen || sidebarOpen

  // A drawer that stays open after navigating is the most annoying mobile bug,
  // so close it whenever the route changes.
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  // Escape closes the drawer, and the page behind it should not scroll while
  // it is open.
  useEffect(() => {
    if (!mobileSidebarOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSidebarOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileSidebarOpen, setMobileSidebarOpen])

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teams', label: 'Teams', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const handleLogout = async () => {
    setMobileSidebarOpen(false)
    await logout()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-background transition-all duration-300 ease-in-out',
          'w-64',
          sidebarOpen ? 'lg:w-64' : 'lg:w-16',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-3">
          {expanded ? (
            <Link
              href="/dashboard"
              className="truncate px-1 text-xl font-bold text-primary-600 dark:text-primary-400"
              onClick={() => setMobileSidebarOpen(false)}
            >
              TeamPulse
            </Link>
          ) : (
            <span className="mx-auto text-lg font-bold text-primary-600 dark:text-primary-400">TP</span>
          )}

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu"
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="hidden lg:inline-flex"
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                title={!expanded ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  !expanded && 'lg:justify-center lg:px-2',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
                )}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {expanded && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          {expanded ? (
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                  {user?.full_name || 'User'}
                </p>
                <p className="truncate text-xs text-surface-500 dark:text-surface-400">{user?.email || ''}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}
