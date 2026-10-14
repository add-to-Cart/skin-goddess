import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.search)    qs.set('search',    params.search)
  if (params.category)  qs.set('category',  params.category)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to)
  return qs.toString() ? `?${qs}` : ''
}

const expensesService = {
  getAll:   (params)     => api.get(`/expenses${buildQuery(params)}`),
  getById:  (id)         => api.get(`/expenses/${id}`),
  create:   (data)       => api.post('/expenses', data),
  update:   (id, data)   => api.patch(`/expenses/${id}`, data),
  delete:   (id)         => api.delete(`/expenses/${id}`),
}

export default expensesService
