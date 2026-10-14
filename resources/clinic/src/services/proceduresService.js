import api from './apiClient'

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id)  qs.set('client_id',  params.client_id)
  if (params.date_from)  qs.set('date_from',   params.date_from)
  if (params.date_to)    qs.set('date_to',     params.date_to)
  return qs.toString() ? `?${qs}` : ''
}

const proceduresService = {
  getAll:   (params)        => api.get(`/procedures${buildQuery(params)}`),
  getById:  (id)            => api.get(`/procedures/${id}`),
  create:   (data)          => api.post('/procedures', data),
  update:   (id, data)      => api.patch(`/procedures/${id}`, data),

  // Supplies sub-resource
  addSupply:    (procedureId, data) => api.post(`/procedures/${procedureId}/supplies`, data),
  removeSupply: (procedureId, supplyId) =>
    api.delete(`/procedures/${procedureId}/supplies/${supplyId}`),
}

export default proceduresService
