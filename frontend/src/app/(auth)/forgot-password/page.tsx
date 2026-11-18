'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Toaster } from '@/components/ui/Toaster'
import { Mail, RotateCcw } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const handleSubmitForm = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setErrorMessage(null)
    setStatus('idle')
    try {
      await authApi.forgotPassword(data)
      setStatus('success')
      reset()
    } catch (err: any) {
      setStatus('error')
      const detail = err?.response?.data?.detail
      setErrorMessage(typeof detail === 'string' ? detail : 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white dark:from-surface-900 dark:to-surface-950 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <RotateCcw className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="p-4 rounded-md bg-green-50 text-green-700 text-sm dark:bg-green-900/20 dark:text-green-400">
              <p className="font-medium">Check your inbox</p>
              <p className="mt-1">
                If an account exists for that email, you'll receive a password reset link shortly.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {status !== 'success' && (
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <Button type="submit" className="w-full" loading={isLoading}>
                Send reset link
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-surface-600 dark:text-surface-400">
            Remember your password?{' '}
            <Link href="/login" className="text-primary-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}