'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { authApi, notificationsApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Textarea } from '@/components/ui/Textarea'
import {
  Loader2,
  User,
  Shield,
  Bell,
  Key,
  Palette,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface NotificationPreferences {
  email_enabled: boolean
  push_enabled: boolean
  task_assigned: boolean
  task_updated: boolean
  comments: boolean
  mentions: boolean
  weekly_digest: boolean
}

const defaultNotifications: NotificationPreferences = {
  email_enabled: true,
  push_enabled: false,
  task_assigned: true,
  task_updated: true,
  comments: true,
  mentions: true,
  weekly_digest: false,
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const

type TabId = (typeof tabs)[number]['id']

function SettingsContent() {
  const { data: session, update: updateSession } = useSession()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const addToast = useUIStore((state) => state.addToast)

  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Keep the deep-linked tab in sync (/settings?tab=security). The navbar links
  // here, and without this the page always opened on Profile.
  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested && tabs.some((tab) => tab.id === requested)) {
      setActiveTab(requested as TabId)
    }
  }, [searchParams])

  // GET /auth/me is the source of truth. The NextAuth session only has what the
  // login callback put there, so bio/avatar would otherwise look empty.
  const { data: me, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  })

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    bio: '',
    avatar_url: '',
  })

  useEffect(() => {
    if (!me?.user) return
    setProfile({
      full_name: me.user.full_name || '',
      email: me.user.email || '',
      bio: me.user.bio || '',
      avatar_url: me.user.avatar_url || '',
    })
  }, [me])

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)

  useEffect(() => {
    notificationsApi
      .getPreferences()
      .then((data) => {
        const { user_id: _userId, ...prefs } = data
        setNotifications({ ...defaultNotifications, ...prefs })
      })
      .catch(() => {
        // Offline/dev fallback so the form isn't stuck on a spinner.
        const stored = localStorage.getItem('teampulse:notifications')
        if (stored) {
          try {
            setNotifications({ ...defaultNotifications, ...JSON.parse(stored) })
          } catch {
            // use defaults
          }
        }
      })
      .finally(() => setNotificationsLoaded(true))
  }, [])

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: async (user) => {
      queryClient.setQueryData(['me'], (current: typeof me) =>
        current ? { ...current, user: { ...current.user, ...user } } : current
      )
      // Push the new name/avatar into the JWT so the navbar updates without a
      // full reload.
      await updateSession({
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
      })
      addToast({ type: 'success', message: 'Profile updated' })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error?.response?.data?.detail || 'Could not update your profile',
      })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
      addToast({ type: 'success', message: 'Password changed' })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error?.response?.data?.detail || 'Could not change your password',
      })
    },
  })

  const themeMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onError: () => {
      addToast({ type: 'error', message: 'Could not save your theme preference' })
    },
  })

  const handleThemeChange = (next: 'light' | 'dark' | 'system') => {
    // Apply instantly, then persist. Waiting on the network would leave the
    // page in the old theme for a beat.
    setTheme(next)
    queryClient.setQueryData(['me'], (current: typeof me) =>
      current ? { ...current, user: { ...current.user, theme: next } } : current
    )
    themeMutation.mutate({ theme: next })
  }

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile.full_name.trim()) {
      addToast({ type: 'error', message: 'Your name cannot be empty' })
      return
    }
    setIsSavingProfile(true)
    try {
      await updateProfileMutation.mutateAsync({
        full_name: profile.full_name.trim(),
        bio: profile.bio,
        // Send "" instead of undefined so clearing the field actually removes
        // the avatar and we fall back to Gravatar/initials.
        avatar_url: profile.avatar_url.trim(),
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (passwords.new_password.length < 8) {
      addToast({ type: 'error', message: 'New password must be at least 8 characters' })
      return
    }
    if (passwords.new_password !== passwords.confirm_password) {
      addToast({ type: 'error', message: 'Passwords do not match' })
      return
    }
    await changePasswordMutation.mutateAsync({
      current_password: passwords.current_password,
      new_password: passwords.new_password,
    })
  }

  const handleNotificationsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingNotifications(true)
    try {
      const saved = await notificationsApi.updatePreferences(notifications)
      const { user_id: _userId, ...prefs } = saved
      setNotifications({ ...defaultNotifications, ...prefs })
      localStorage.setItem('teampulse:notifications', JSON.stringify(prefs))
      addToast({ type: 'success', message: 'Notification preferences saved' })
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error?.response?.data?.detail || 'Could not save notification preferences',
      })
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const connectedAccounts = new Set(me?.oauth_providers ?? [])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and security settings"
      />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Section nav: horizontal on small screens so it doesn't squeeze the form */}
        <div className="md:w-48 md:flex-shrink-0">
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Settings sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1 max-w-3xl">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProfile ? (
                  <div className="flex items-center gap-2 py-8 text-surface-500">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                    Loading your profile...
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <Avatar
                        src={profile.avatar_url || null}
                        name={profile.full_name || session?.user?.full_name || undefined}
                        email={profile.email || session?.user?.email}
                        size="xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium">Profile picture</h4>
                        <p className="mb-2 text-sm text-surface-500">
                          Paste an image URL, or leave it empty to use Gravatar / your initials.
                        </p>
                        <Input
                          label="Avatar URL"
                          value={profile.avatar_url}
                          onChange={(event) =>
                            setProfile({ ...profile, avatar_url: event.target.value })
                          }
                          placeholder="https://example.com/avatar.png"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Full Name"
                        value={profile.full_name}
                        onChange={(event) =>
                          setProfile({ ...profile, full_name: event.target.value })
                        }
                        required
                      />
                      <Input label="Email" type="email" value={profile.email} disabled />
                    </div>

                    <div>
                      <label htmlFor="bio" className="label mb-1 block">
                        Bio
                      </label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        maxLength={1000}
                        onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                        rows={3}
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div className="flex justify-end border-t border-border pt-4">
                      <Button type="submit" loading={isSavingProfile || updateProfileMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <Input
                    label="Current Password"
                    type="password"
                    value={passwords.current_password}
                    onChange={(event) =>
                      setPasswords({ ...passwords, current_password: event.target.value })
                    }
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    showToggle
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={passwords.new_password}
                    onChange={(event) =>
                      setPasswords({ ...passwords, new_password: event.target.value })
                    }
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    showToggle
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwords.confirm_password}
                    onChange={(event) =>
                      setPasswords({ ...passwords, confirm_password: event.target.value })
                    }
                    placeholder="Repeat the new password"
                    autoComplete="new-password"
                    required
                    showToggle
                  />

                  <div className="flex justify-end border-t border-border pt-4">
                    <Button type="submit" loading={changePasswordMutation.isPending}>
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  </div>
                </form>

                <div className="mt-8 border-t border-border pt-6">
                  <h4 className="mb-1 font-medium">Connected Accounts</h4>
                  <p className="mb-4 text-sm text-surface-500">
                    Sign-in methods linked to {profile.email || 'this account'}.
                  </p>
                  <div className="space-y-3">
                    {[
                      { id: 'google', name: 'Google' },
                      { id: 'github', name: 'GitHub' },
                    ].map((account) => {
                      const connected = connectedAccounts.has(account.id)
                      return (
                        <div
                          key={account.id}
                          className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-surface-500" />
                            <span className="font-medium">{account.name}</span>
                          </div>
                          <Badge variant={connected ? 'success' : 'secondary'}>
                            {connected ? 'Connected' : 'Not connected'}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent>
                {!notificationsLoaded ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                    <span className="ml-2 text-surface-500">Loading preferences...</span>
                  </div>
                ) : (
                  <form onSubmit={handleNotificationsSubmit} className="space-y-6">
                    <div>
                      <h4 className="mb-4 font-medium">Delivery Methods</h4>
                      <div className="space-y-3">
                        {[
                          {
                            key: 'email_enabled' as const,
                            label: 'Email Notifications',
                            desc: 'Receive notifications via email',
                          },
                          {
                            key: 'push_enabled' as const,
                            label: 'Push Notifications',
                            desc: 'Receive browser push notifications',
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <Bell className="h-5 w-5 text-surface-500" />
                              <div>
                                <p className="font-medium">{item.label}</p>
                                <p className="text-sm text-surface-500">{item.desc}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={notifications[item.key]}
                              onChange={(event) =>
                                setNotifications({ ...notifications, [item.key]: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-4 font-medium">Activity Notifications</h4>
                      <div className="space-y-3">
                        {[
                          { key: 'task_assigned' as const, label: 'Task Assigned', desc: 'When a task is assigned to you' },
                          { key: 'task_updated' as const, label: 'Task Updated', desc: 'When a task you follow is updated' },
                          { key: 'comments' as const, label: 'Comments', desc: 'When someone comments on your tasks' },
                          { key: 'mentions' as const, label: 'Mentions', desc: 'When you are mentioned in a comment' },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <MessageSquare className="h-5 w-5 text-surface-500" />
                              <div>
                                <p className="font-medium">{item.label}</p>
                                <p className="text-sm text-surface-500">{item.desc}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={notifications[item.key]}
                              onChange={(event) =>
                                setNotifications({ ...notifications, [item.key]: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-4 font-medium">Digest</h4>
                      <label className="flex cursor-pointer items-center justify-between rounded-lg p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-surface-500" />
                          <div>
                            <p className="font-medium">Weekly Digest</p>
                            <p className="text-sm text-surface-500">
                              Receive a weekly summary of your team&apos;s activity
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.weekly_digest}
                          onChange={(event) =>
                            setNotifications({ ...notifications, weekly_digest: event.target.checked })
                          }
                          className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end border-t border-border pt-4">
                      <Button type="submit" loading={isSavingNotifications}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how TeamPulse looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="mb-1 font-medium">Theme</h4>
                  <p className="mb-4 text-sm text-surface-500">
                    System follows your operating system setting.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {([
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleThemeChange(option.value)}
                        aria-pressed={theme === option.value}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                          theme === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-border hover:border-surface-300 dark:hover:border-surface-600'
                        )}
                      >
                        <option.icon
                          className={cn(
                            'h-6 w-6',
                            theme === option.value
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-surface-500'
                          )}
                        />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="border-t border-border pt-4 text-sm text-surface-500">
                  Your choice is saved to your account and applies on every device you sign in from.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
