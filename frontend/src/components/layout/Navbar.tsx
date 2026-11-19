'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Menu, Bell, Sun, Moon, Monitor, User, LogOut, Settings } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Toaster } from '@/components/ui/Toaster'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { sidebarOpen, toggleMobileSidebar } = useUIStore()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)

  // next-themes only knows the resolved theme on the client. Rendering the
  // icon before that causes a hydration mismatch, so wait one paint.
  useEffect(() => setMounted(true), [])

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  const activeTheme = mounted ? (theme === 'system' ? 'system' : resolvedTheme || 'light') : 'system'
  const ThemeIcon = themeIcons[activeTheme as keyof typeof themeIcons] || Monitor

  const handleProfile = () => router.push('/settings?tab=profile')
  const handleSettings = () => router.push('/settings?tab=security')
  const handleNotifications = () => router.push('/settings?tab=notifications')
  const handleThemeChange = (next: 'light' | 'dark' | 'system') => {
    setTheme(next)
    queryClient.setQueryData(['me'], (current: any) =>
      current?.user ? { ...current, user: { ...current.user, theme: next } } : current
    )
    // Fire and forget: the colour is already applied locally.
    authApi.updateProfile({ theme: next }).catch(() => {})
  }
  const handleLogout = async () => {
    await logout()
  }

  const userMenuItems: DropdownItem[] = [
    { label: 'Profile', onClick: handleProfile, icon: <User className="h-4 w-4" /> },
    { label: 'Settings', onClick: handleSettings, icon: <Settings className="h-4 w-4" /> },
    { label: 'Log out', onClick: handleLogout, icon: <LogOut className="h-4 w-4" />, destructive: true },
  ]

  return (
    <>
      {/*
        right-0 + left-* pins the header next to the fixed sidebar. Using
        left-64 on mobile too was what pushed the nav tabs 256px to the right.
      */}
      <header
        className={cn(
          'fixed right-0 top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md',
          'left-0',
          sidebarOpen ? 'lg:left-64' : 'lg:left-16'
        )}
      >
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileSidebar}
              className="lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden items-center gap-6 md:flex">
              {['dashboard', 'teams', 'settings'].map((route) => {
                const isActive = pathname === `/${route}` || pathname.startsWith(`/${route}/`)
                return (
                  <Link
                    key={route}
                    href={`/${route}`}
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'
                    )}
                  >
                    {route.charAt(0).toUpperCase() + route.slice(1)}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dropdown
              trigger={
                <Button variant="ghost" size="icon" aria-label="Change theme">
                  <ThemeIcon className="h-5 w-5" />
                </Button>
              }
              items={[
                { label: 'Light', onClick: () => handleThemeChange('light'), icon: <Sun className="h-4 w-4" /> },
                { label: 'Dark', onClick: () => handleThemeChange('dark'), icon: <Moon className="h-4 w-4" /> },
                { label: 'System', onClick: () => handleThemeChange('system'), icon: <Monitor className="h-4 w-4" /> },
              ]}
            />

            <Button variant="ghost" size="icon" aria-label="Notifications" onClick={handleNotifications}>
              <Bell className="h-5 w-5" />
            </Button>

            <Dropdown
              trigger={
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar
                    src={user?.avatar_url || null}
                    name={user?.full_name ?? undefined}
                    email={user?.email}
                    size="sm"
                  />
                  <span className="hidden text-sm font-medium sm:block">{user?.full_name}</span>
                </Button>
              }
              items={userMenuItems}
            />
          </div>
        </div>
      </header>

      <Toaster />
    </>
  )
}
