'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, Bell, Sun, Moon, Monitor, User, LogOut, Settings } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Toaster } from '@/components/ui/Toaster'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { theme, setTheme, sidebarOpen, toggleSidebar } = useUIStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  const ThemeIcon = themeIcons[theme] || Monitor

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  const handleProfile = () => router.push('/settings?tab=profile')
  const handleSettings = () => router.push('/settings?tab=security')
  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const userMenuItems: DropdownItem[] = [
    { label: 'Profile', onClick: handleProfile, icon: <User className="h-4 w-4" /> },
    { label: 'Settings', onClick: handleSettings, icon: <Settings className="h-4 w-4" /> },
    { label: 'Log out', onClick: handleLogout, icon: <LogOut className="h-4 w-4" />, destructive: true },
  ]

  return (
    <>
      <header className={cn('fixed top-0 right-0 z-30 h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-border', sidebarOpen ? 'left-64' : 'left-16')}>
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden md:flex md:items-center md:gap-6">
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
                <Button variant="ghost" size="icon" aria-label="Theme">
                  <ThemeIcon className="h-5 w-5" />
                </Button>
              }
              items={[
                { label: 'Light', onClick: () => handleThemeChange('light'), icon: <Sun className="h-4 w-4" /> },
                { label: 'Dark', onClick: () => handleThemeChange('dark'), icon: <Moon className="h-4 w-4" /> },
                { label: 'System', onClick: () => handleThemeChange('system'), icon: <Monitor className="h-4 w-4" /> },
              ]}
            />

            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>

            <Dropdown
              trigger={
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar src={user?.avatar_url || null} name={user?.full_name ?? undefined} size="sm" />
                  <span className="hidden sm:block text-sm font-medium">{user?.full_name}</span>
                </Button>
              }
              items={userMenuItems}
            />
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <Toaster />
    </>
  )
}