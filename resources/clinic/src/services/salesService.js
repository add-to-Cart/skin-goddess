import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.paginated) qs.set('paginated', '1')
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.search) qs.set('search', params.search)
  if (params.include_client) qs.set('include_client', '1')
  if (params.client_id)      qs.set('client_id',      params.client_id)
  if (params.date_from)      qs.set('date_from',       params.date_from)
  if (params.date_to)        qs.set('date_to',         params.date_to)
  if (params.payment_status) qs.set('payment_status',  params.payment_status)
  return qs.toString() ? `?${qs}` : ''
}

const salesService = {
  getPage: (params = {}) => api.get(`/sales${buildQuery({ ...params, paginated: true })}`),
  getAll:     (params)   => api.get(`/sales${buildQuery(params)}`),
  getById:    (id)       => api.get(`/sales/${id}`),
  getSummary: (id)       => api.get(`/sales/${id}/summary`),
  getCorrections: (id)   => api.get(`/sales/${id}/corrections`),
  getSessions: (id) => api.get(`/sales/${id}/sessions`),
  completeSession: (id, data) => api.post(`/sales/${id}/sessions`, data),
  reverseSession: (id, procedureId, data) => api.post(`/sales/${id}/sessions/${procedureId}/reverse`, data),
  cancelPackage: (id, data) => api.post(`/sales/${id}/cancel-package`, data),
  create:     (data)     => api.post('/sales', data),
  update:     (id, data) => api.patch(`/sales/${id}`, data),
}

export default salesService
