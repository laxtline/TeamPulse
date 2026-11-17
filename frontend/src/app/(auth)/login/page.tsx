'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Toaster } from '@/components/ui/Toaster'
import { Mail, Lock, Github, Chrome } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleSubmitForm = async (data: LoginFormData) => {
    setIsLoading(true)
    setFormError(null)
    try {
      // NextAuth's authorize() runs server-side, so the backend's httpOnly
      // access/refresh cookies must be established by the browser itself.
      await authApi.login({ email: data.email, password: data.password })

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setFormError('Invalid email or password')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setFormError('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = (provider: 'google' | 'github') => {
    signIn(provider, { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white dark:from-surface-900 dark:to-surface-950 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your TeamPulse account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || formError) && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm dark:bg-red-900/20 dark:text-red-400">
              {formError || (error === 'CredentialsSignin' ? 'Invalid email or password' : 'An error occurred. Please try again.')}
            </div>
          )}

          <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
              leftIcon={<Lock className="h-4 w-4" />}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              Sign in
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-surface-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
            >
              <Chrome className="h-4 w-4 mr-2" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-surface-600 dark:text-surface-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <div className="p-3 rounded-md bg-surface-100 dark:bg-surface-800 text-xs text-surface-600 dark:text-surface-400">
            <strong>Demo Credentials:</strong>
            <br />
            john@teampulse.demo / Demo@12345
            <br />
            jane@teampulse.demo / Demo@12345
            <br />
            bob@teampulse.demo / Demo@12345
          </div>
        </CardContent>
      </Card>
    </div>
  )
}