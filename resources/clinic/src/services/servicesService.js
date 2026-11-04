import api from './apiClient'

/**
 * Manages the menu of services/procedures the business offers.
 * Not to be confused with the src/services/ folder — this talks to /api/services.
 */
const servicesService = {
  lookup: (search) => api.get(`/services/lookup?${new URLSearchParams({ search })}`),
  getAll:  (activeOnly = true) => api.get(`/services?active_only=${activeOnly}`),
  getById: (id)                => api.get(`/services/${id}`),
  create:  (data)              => api.post('/services', data),
  update:  (id, data)          => api.patch(`/services/${id}`, data),
}

export default servicesService
