import api from './apiClient'

const inventoryService = {
  lookup: (search) => api.get(`/inventory/items/lookup?${new URLSearchParams({ search })}`),
  getActive: () => api.get('/inventory/items?active_only=true'),
}

export default inventoryService
