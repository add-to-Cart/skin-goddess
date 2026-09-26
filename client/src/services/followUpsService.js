import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', params.client_id)
  if (params.status)    qs.set('status',    params.status)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to)
  return qs.toString() ? `?${qs}` : ''
}

const followUpsService = {
  getAll:     (params)     => api.get(`/follow-ups${buildQuery(params)}`),
  getUpcoming: (daysAhead = 7) => api.get(`/follow-ups/upcoming?days_ahead=${daysAhead}`),
  getOverdue:  ()          => api.get('/follow-ups/overdue'),
  getById:    (id)         => api.get(`/follow-ups/${id}`),
  create:     (data)       => api.post('/follow-ups', data),
  update:     (id, data)   => api.patch(`/follow-ups/${id}`, data),
}

export default followUpsService
