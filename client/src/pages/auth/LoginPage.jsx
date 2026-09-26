import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) {
      setError('Enter your username and password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await authService.login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-[var(--shadow-lg)] p-8"
        style={{
          background:   'var(--color-surface)',
          borderColor:  'var(--color-border)',
        }}
      >
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'var(--color-brand)' }}
          >
            SG
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Skin Goddess
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Clinic Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null) }}
              placeholder="admin"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              role="alert"
              style={{
                background: 'var(--color-danger-bg)',
                color:      'var(--color-danger)',
              }}
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
