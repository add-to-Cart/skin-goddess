import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import './LoginPage.css'

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
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-brand">
          <div className="login-mark" aria-hidden="true">SG</div>
          <p className="login-eyebrow">Skin Goddess Clinic</p>
        </div>

        <div className="login-intro">
          <h1 id="login-heading">Welcome back</h1>
          <p>Sign in to continue to your workspace.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="login-label" htmlFor="username">Username</Label>
            <Input
              className="login-input"
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
            <Label className="login-label" htmlFor="password">Password</Label>
            <Input
              className="login-input"
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
              className="login-error"
              role="alert"
              style={{
                background: 'var(--color-danger-bg)',
                color:      'var(--color-danger)',
              }}
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="login-submit w-full mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="login-footer">Private clinic portal</p>
      </section>
    </main>
  )
}
