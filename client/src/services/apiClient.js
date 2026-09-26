/**
 * Base API client.
 *
 * All requests go through the Vite proxy → FastAPI.
 * Base URL is /api — no hardcoded host, so it works in dev and prod unchanged.
 *
 * Usage:
 *   import api from './apiClient'
 *   const clients = await api.get('/clients')
 *   const created  = await api.post('/clients', { first_name: 'Maria', ... })
 */

const BASE = '/api'

async function request(method, path, body = undefined) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }

  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE}${path}`, options)

  // 204 No Content — return null, not JSON
  if (response.status === 204) return null

  const data = await response.json()

  if (!response.ok) {
    // FastAPI validation errors come back as { detail: [...] }
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
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  put:    (path, body)   => request('PUT',    path, body),
  delete: (path)         => request('DELETE', path),
}

export default api
