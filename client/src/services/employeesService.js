import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.search)      qs.set('search',      params.search)
  if (params.active_only != null) qs.set('active_only', String(params.active_only))
  return qs.toString() ? `?${qs}` : ''
}

const employeesService = {
  getAll:     (params)     => api.get(`/employees${buildQuery(params)}`),
  getById:    (id)         => api.get(`/employees/${id}`),
  create:     (data)       => api.post('/employees', data),
  update:     (id, data)   => api.patch(`/employees/${id}`, data),
  deactivate: (id)         => api.delete(`/employees/${id}`),
}

export default employeesService
