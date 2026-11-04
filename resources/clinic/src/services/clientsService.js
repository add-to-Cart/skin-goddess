import api from './apiClient'

/**
 * Mirrors GET /api/clients query params.
 * @param {Object} params
 * @param {string} [params.search]
 */
function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.paginated) qs.set('paginated', '1')
  return qs.toString() ? `?${qs}` : ''
}

const clientsService = {
  lookup: (search) => api.get(`/clients/lookup?${new URLSearchParams({ search })}`),
  findMatchingNames: (first_name, last_name) => api.get(`/clients/lookup?${new URLSearchParams({ first_name, last_name })}`),
  getPage: (params = {}) => api.get(`/clients${buildQuery({ ...params, paginated: true })}`),
  getAll:    (params)      => api.get(`/clients${buildQuery(params)}`),
  getById:   (id)          => api.get(`/clients/${id}`),
  create:    (data)        => api.post('/clients', data),
  update:    (id, data)    => api.patch(`/clients/${id}`, data),
  deactivate:(id)          => api.delete(`/clients/${id}`),
}

export default clientsService
