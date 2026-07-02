'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Store } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('from') ?? '/dashboard'

  const [phone, setPhone] = useState('+231')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  function startCountdown() {
    setCountdown(60)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim() || !password.trim()) {
      setError('Phone number and password are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        const msg: Record<string, string> = {
          invalid_credentials: 'Incorrect phone number or password.',
          too_many_attempts: 'Too many failed attempts. Please try again in 1 hour.',
          account_blocked: 'Your account has been restricted. Contact support.',
          password_not_set: 'No password set on this account. Please use the mobile app to set a password.',
        }
        setError(msg[data.error as string] ?? data.error ?? 'Login failed.')
        return
      }

      if (data.success) {
        router.push(redirectTo)
        return
      }

      // New device — OTP required
      if (data.next === 'verify_device') {
        setTempToken(data.temp_token)
        setPhoneMasked(data.phone_masked ?? phone)
        setStep('otp')
        startCountdown()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otp.trim()) {
      setError('Please enter the verification code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, otp: otp.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        const msg: Record<string, string> = {
          invalid_otp: 'Incorrect verification code.',
          token_expired: 'Verification session expired. Please start over.',
        }
        setError(msg[data.error as string] ?? data.error ?? 'OTP verification failed.')
        return
      }

      router.push(redirectTo)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    setError('')
    setLoading(true)
    try {
      // Re-trigger the login flow to get a new OTP
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to resend code.')
        return
      }
      if (data.next === 'verify_device') {
        setTempToken(data.temp_token)
        startCountdown()
      }
    } catch {
      setError('Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bb-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--bb-ink)] mb-4">
            <Store size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--bb-ink)]">Blue Boney Market</h1>
          <p className="text-sm text-[var(--bb-ink-soft)] mt-1">Seller Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[var(--bb-border)] p-8">
          {step === 'credentials' ? (
            <>
              <h2 className="text-lg font-semibold text-[var(--bb-ink)] mb-6">Sign in to your account</h2>

              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--bb-ink)] mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+231 770 000 000"
                    autoComplete="tel"
                    className="w-full border border-[var(--bb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--bb-ink)] placeholder-[var(--bb-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--m-blue)] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--bb-ink)] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full border border-[var(--bb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--bb-ink)] placeholder-[var(--bb-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--m-blue)] focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[var(--m-red)] bg-[var(--m-red-soft)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[var(--m-blue)] text-white text-sm font-semibold hover:bg-[var(--m-blue-dark)] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[var(--bb-ink)] mb-2">Verify your device</h2>
              <p className="text-sm text-[var(--bb-ink-soft)] mb-6">
                We sent a 6-digit code to <span className="font-medium text-[var(--bb-ink)]">{phoneMasked}</span>.
                Enter it below to continue.
              </p>

              <form onSubmit={handleOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--bb-ink)] mb-1.5">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="w-full border border-[var(--bb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--bb-ink)] placeholder-[var(--bb-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--m-blue)] focus:border-transparent transition tracking-widest font-mono text-center text-lg"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[var(--m-red)] bg-[var(--m-red-soft)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-2.5 rounded-lg bg-[var(--m-blue)] text-white text-sm font-semibold hover:bg-[var(--m-blue-dark)] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </form>

              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-[var(--bb-ink-muted)]">
                    Resend code in {countdown}s
                  </p>
                ) : (
                  <button
                    onClick={resendOtp}
                    disabled={loading}
                    className="text-xs text-[var(--m-blue)] hover:underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <button
                onClick={() => { setStep('credentials'); setOtp(''); setError('') }}
                className="mt-3 w-full text-xs text-[var(--bb-ink-soft)] hover:text-[var(--bb-ink)] text-center"
              >
                ← Back to sign in
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[var(--bb-ink-muted)] mt-6">
          Blue Boney Financial Services · Liberia
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
