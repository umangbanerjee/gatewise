'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, User } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type LoginInput = z.infer<typeof loginSchema>

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type ForgotInput = z.infer<typeof forgotSchema>

function SetupErrorBanner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  if (error !== 'profile_missing') return null
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
      ⚠️ Your account profile is missing. The database migration may not have been run yet. Please contact the administrator.
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const forgotForm = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) })

  async function onLogin(data: LoginInput) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setError('root', { message: 'Invalid email or password. Please try again.' })
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function onForgot(data: ForgotInput) {
    // Always show confirmation — no email enumeration
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    })
    setForgotSent(true)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    })
    if (error) {
      if (error.message?.toLowerCase().includes('provider') || error.status === 400) {
        toast.error('Google sign-in is not configured yet. Please use email/password.')
      } else {
        toast.error('Google sign-in failed. Please try again.')
      }
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left — campus photo */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-end bg-gray-900 overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 z-10" />
        {/* Background */}
        <div className="absolute inset-0 bg-[url('/campus.jpg')] bg-cover bg-center" />
        <div className="relative z-20 p-12">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Welcome to<br />
            <span className="text-5xl">Starex One</span>
          </h1>
          <p className="mt-3 text-lg font-semibold text-white/90">Sign In to get started.</p>
          <p className="text-sm text-white/70 mt-1">
            The details have already been shared to you via email.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden text-center">
            <h1 className="text-2xl font-bold">Welcome to Starex One</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to get started</p>
          </div>

          <Suspense fallback={null}>
            <SetupErrorBanner />
          </Suspense>

          {forgotMode ? (            forgotSent ? (
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists for that address, a password reset link has been sent.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setForgotSent(false) }}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">Reset Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      {...forgotForm.register('email')}
                    />
                  </div>
                  {forgotForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={forgotForm.formState.isSubmitting}>
                  {forgotForm.formState.isSubmitting ? 'Sending…' : 'Send Reset Link'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
                  Back to Sign In
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit(onLogin)} method="post" className="space-y-5">
              {/* Google */}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogle}
                disabled={googleLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Sign In with Google'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">OR</span>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="text"
                    placeholder="you@starex.edu.in"
                    className="pr-10"
                    {...register('email')}
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {/* Forgot */}
              <div className="flex justify-start">
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setForgotMode(true)}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Root error */}
              {errors.root && (
                <p className="text-sm text-destructive text-center">{errors.root.message}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Log In'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
