'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, notificationsApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { Loader2, User, Shield, Bell, Key, Palette, Globe, Moon, Sun, Save, CheckCircle2, MessageSquare, Calendar } from 'lucide-react'
import { Toaster } from '@/components/ui/Toaster'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

// Notification preferences type (matches backend schema)
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
  push_enabled: true,
  task_assigned: true,
  task_updated: true,
  comments: true,
  mentions: true,
  weekly_digest: false,
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)

  // Profile form state
  const [profile, setProfile] = useState({
    full_name: session?.user?.full_name || '',
    email: session?.user?.email || '',
    bio: '',
    avatar_url: session?.user?.avatar_url || '',
  })

  // Password form state
  const [password, setPassword] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)

  // Load notification preferences from backend on mount
  useEffect(() => {
    notificationsApi.getPreferences()
      .then((data) => {
        setNotifications(data)
        setNotificationsLoaded(true)
      })
      .catch(() => {
        // Fallback to localStorage
        const stored = localStorage.getItem('teampulse:notifications')
        if (stored) {
          try {
            setNotifications(JSON.parse(stored))
          } catch {
            // Use defaults
          }
        }
        setNotificationsLoaded(true)
      })
  }, [])

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Profile updated successfully')
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setPassword({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to change password')
    },
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await updateProfileMutation.mutateAsync({
      full_name: profile.full_name,
      avatar_url: profile.avatar_url || undefined,
    })
    setIsSaving(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.new_password !== password.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    await changePasswordMutation.mutateAsync({
      current_password: password.current_password,
      new_password: password.new_password,
    })
  }

  const handleNotificationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await notificationsApi.updatePreferences(notifications)
      localStorage.setItem('teampulse:notifications', JSON.stringify(notifications))
      toast.success('Notification preferences saved')
    } catch {
      // Fallback to localStorage
      localStorage.setItem('teampulse:notifications', JSON.stringify(notifications))
      toast.success('Notification preferences saved locally')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and security settings"
      />

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'appearance', label: 'Appearance', icon: Palette },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-3xl">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar src={profile.avatar_url ?? session?.user?.avatar_url} name={profile.full_name ?? session?.user?.full_name ?? undefined} size="xl" />
                    <div>
                      <h4 className="font-medium">Profile Picture</h4>
                      <p className="text-sm text-surface-500">Enter a URL for your avatar image</p>
                      <Input
                        label="Avatar URL"
                        value={profile.avatar_url}
                        onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                        placeholder="https://example.com/avatar.png"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Full Name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={profile.email}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="label">Bio</label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" loading={isSaving || updateProfileMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="label">Current Password</label>
                    <Input
                      type="password"
                      value={password.current_password}
                      onChange={(e) => setPassword({ ...password, current_password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <Input
                      type="password"
                      value={password.new_password}
                      onChange={(e) => setPassword({ ...password, new_password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <Input
                      type="password"
                      value={password.confirm_password}
                      onChange={(e) => setPassword({ ...password, confirm_password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" loading={changePasswordMutation.isPending}>
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </form>

                <div className="mt-8 border-t border-border pt-6">
                  <h4 className="font-medium mb-4">Connected Accounts</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Google', connected: true, icon: Globe },
                      { name: 'GitHub', connected: true, icon: Globe },
                    ].map((account) => (
                      <div key={account.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                        <div className="flex items-center gap-3">
                          <account.icon className="h-5 w-5 text-surface-500" />
                          <span className="font-medium">{account.name}</span>
                        </div>
                        <Badge variant={account.connected ? 'success' : 'secondary'}>
                          {account.connected ? 'Connected' : 'Connect'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                  <h4 className="font-medium mb-4 text-red-600">Danger Zone</h4>
                  <p className="text-sm text-surface-500 mb-4">Deleting your account will permanently remove all your data.</p>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
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
                    <h4 className="font-medium mb-4">Delivery Methods</h4>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Bell className="h-5 w-5 text-surface-500" />
                          <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-surface-500">Receive notifications via email</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.email_enabled}
                          onChange={(e) => setNotifications({ ...notifications, email_enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Bell className="h-5 w-5 text-surface-500" />
                          <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-surface-500">Receive browser push notifications</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.push_enabled}
                          onChange={(e) => setNotifications({ ...notifications, push_enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Activity Notifications</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'task_assigned', label: 'Task Assigned', desc: 'When a task is assigned to you' },
                        { key: 'task_updated', label: 'Task Updated', desc: 'When a task you follow is updated' },
                        { key: 'comments', label: 'Comments', desc: 'When someone comments on your tasks' },
                        { key: 'mentions', label: 'Mentions', desc: 'When you are mentioned in a comment' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-surface-500" />
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-sm text-surface-500">{item.desc}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof NotificationPreferences]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Digest</h4>
                    <label className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-surface-500" />
                        <div>
                          <p className="font-medium">Weekly Digest</p>
                          <p className="text-sm text-surface-500">Receive a weekly summary of your team's activity</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.weekly_digest}
                        onChange={(e) => setNotifications({ ...notifications, weekly_digest: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </div>
                </form>
              )}
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how TeamPulse looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Theme</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Globe },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2',
                          theme === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-border hover:border-surface-300 dark:hover:border-surface-600'
                        )}
                      >
                        <option.icon className={cn('h-6 w-6', theme === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-surface-500')} />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Density</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {['comfortable', 'compact', 'condensed'].map((density) => (
                      <button
                        key={density}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all',
                          'border-border hover:border-surface-300 dark:hover:border-surface-600'
                        )}
                      >
                        <span className="font-medium capitalize">{density}</span>
                        <p className="text-sm text-surface-500 mt-1">Coming soon</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}