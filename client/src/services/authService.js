import { tokenStore, VITE_API_BASE } from './apiClient'

const BASE = `${VITE_API_BASE}/api/auth`

/**
 * POST /api/auth/login
 * Sends username + password as form-encoded data (OAuth2 standard).
 * Stores the returned JWT in localStorage.
 */
async function login(username, password) {
  const body = new URLSearchParams()
  body.append('username', username)
  body.append('password', password)

  const response = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await response.json()

  if (!response.ok) {
    const msg = typeof data?.detail === 'string' ? data.detail : 'Login failed.'
    throw new Error(msg)
  }

  tokenStore.set(data.access_token)
  return data
}

function logout() {
  tokenStore.clear()
}

function isAuthenticated() {
  return Boolean(tokenStore.get())
}

const authService = { login, logout, isAuthenticated }
export default authService
