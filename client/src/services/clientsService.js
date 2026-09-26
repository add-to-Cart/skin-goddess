import api from './apiClient'

/**
 * Mirrors GET /api/clients query params.
 * @param {Object} params
 * @param {string} [params.search]
 */
function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  return qs.toString() ? `?${qs}` : ''
}

const clientsService = {
  getAll:    (params)      => api.get(`/clients${buildQuery(params)}`),
  getById:   (id)          => api.get(`/clients/${id}`),
  create:    (data)        => api.post('/clients', data),
  update:    (id, data)    => api.patch(`/clients/${id}`, data),
  deactivate:(id)          => api.delete(`/clients/${id}`),
}

export default clientsService
