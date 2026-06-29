import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BRAND } from '@shared/branding'
import { ApiError } from '@/lib/api'

export default function Login(): JSX.Element {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-500 to-gold-300 font-display text-3xl font-bold text-ink-950 shadow-glow">
            {BRAND.greek}
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-50">{BRAND.appName}</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-gold-500">{BRAND.tagline}</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rush@pikesigma.vanderbilt.edu"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <div className="rounded-lg border border-garnet-500/40 bg-garnet-500/15 px-3 py-2 text-sm text-garnet-200">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign In'}
          </Button>
          <p className="text-center text-xs text-ink-400">
            Demo: <span className="text-gold-400">rush@pikesigma.vanderbilt.edu</span> / rush2026
          </p>
        </form>
        <p className="mt-6 text-center text-xs text-ink-400">{BRAND.motto}</p>
      </div>
    </div>
  )
}
