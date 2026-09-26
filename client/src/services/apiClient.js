/**
 * Base API client.
 *
 * All requests go through the Vite proxy → FastAPI.
 * Automatically attaches the JWT from localStorage if present.
 * On 401 responses the stored token is cleared and the page reloads
 * to the login screen.
 */

const BASE = '/api'

const TOKEN_KEY = 'sg_token'

export const tokenStore = {
  get:    ()         => localStorage.getItem(TOKEN_KEY),
  set:    (token)    => localStorage.setItem(TOKEN_KEY, token),
  clear:  ()         => localStorage.removeItem(TOKEN_KEY),
}

async function request(method, path, body = undefined) {
  const headers = { 'Content-Type': 'application/json' }
  const token = tokenStore.get()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const options = { method, headers }
  if (body !== undefined) options.body = JSON.stringify(body)

  const response = await fetch(`${BASE}${path}`, options)

  // 204 No Content
  if (response.status === 204) return null

  // 401 — token expired or invalid
  if (response.status === 401) {
    tokenStore.clear()
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  const data = await response.json()

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg).join(', ')
          : `Request failed: ${response.status}`
    throw new Error(message)
  }

  return data
}

const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  put:    (path, body) => request('PUT',    path, body),
  delete: (path)       => request('DELETE', path),
}

export default api
