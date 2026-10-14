import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id)      qs.set('client_id',      params.client_id)
  if (params.date_from)      qs.set('date_from',       params.date_from)
  if (params.date_to)        qs.set('date_to',         params.date_to)
  if (params.payment_status) qs.set('payment_status',  params.payment_status)
  return qs.toString() ? `?${qs}` : ''
}

const salesService = {
  getAll:     (params)   => api.get(`/sales${buildQuery(params)}`),
  getById:    (id)       => api.get(`/sales/${id}`),
  getSummary: (id)       => api.get(`/sales/${id}/summary`),
  create:     (data)     => api.post('/sales', data),
  update:     (id, data) => api.patch(`/sales/${id}`, data),
}

export default salesService
