import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.employee_id) qs.set('employee_id', params.employee_id)
  if (params.status)      qs.set('status',      params.status)
  return qs.toString() ? `?${qs}` : ''
}

const salaryService = {
  getAll:   (params)     => api.get(`/salary${buildQuery(params)}`),
  getById:  (id)         => api.get(`/salary/${id}`),
  create:   (data)       => api.post('/salary', data),
  update:   (id, data)   => api.patch(`/salary/${id}`, data),
}

export default salaryService
