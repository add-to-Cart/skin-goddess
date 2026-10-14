import { tokenStore } from './apiClient'

const BASE = '/api/auth'

const ROLE_KEY = 'sg_role'
const USERNAME_KEY = 'sg_username'

const roleStore = {
  get: () => localStorage.getItem(ROLE_KEY),
  set: (role) => localStorage.setItem(ROLE_KEY, role),
  clear: () => localStorage.removeItem(ROLE_KEY),
}

const usernameStore = {
  get: () => localStorage.getItem(USERNAME_KEY),
  set: (username) => localStorage.setItem(USERNAME_KEY, username),
  clear: () => localStorage.removeItem(USERNAME_KEY),
}

/**
 * POST /api/auth/login
 * Sends username + password as form-encoded data (OAuth2 standard).
 * Stores the returned JWT, role, and username in localStorage.
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
  roleStore.set(data.role)
  usernameStore.set(data.username)
  return data
}

function logout() {
  tokenStore.clear()
  roleStore.clear()
  usernameStore.clear()
}

function isAuthenticated() {
  return Boolean(tokenStore.get())
}

/** Returns 'admin' | 'staff' | null */
function getRole() {
  return roleStore.get()
}

function getUsername() {
  return usernameStore.get()
}

/** Returns true if the logged-in user is admin. */
function isAdmin() {
  return roleStore.get() === 'admin'
}

const authService = { login, logout, isAuthenticated, getRole, getUsername, isAdmin }
export default authService
