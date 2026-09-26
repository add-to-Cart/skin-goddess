import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.employee_id) qs.set('employee_id', params.employee_id)
  if (params.date_from)   qs.set('date_from',   params.date_from)
  if (params.date_to)     qs.set('date_to',     params.date_to)
  return qs.toString() ? `?${qs}` : ''
}

const attendanceService = {
  getAll:   (params)     => api.get(`/attendance${buildQuery(params)}`),
  getById:  (id)         => api.get(`/attendance/${id}`),
  create:   (data)       => api.post('/attendance', data),
  update:   (id, data)   => api.patch(`/attendance/${id}`, data),
}

export default attendanceService
