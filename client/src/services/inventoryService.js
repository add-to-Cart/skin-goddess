import api from './apiClient'

function itemsQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.search)         qs.set('search',         params.search)
  if (params.category)       qs.set('category',       params.category)
  if (params.low_stock_only) qs.set('low_stock_only', 'true')
  if (params.active_only != null) qs.set('active_only', String(params.active_only))
  return qs.toString() ? `?${qs}` : ''
}

function purchasesQuery(params = {}) {
  const qs = new URLSearchParams()
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to)
  return qs.toString() ? `?${qs}` : ''
}

const inventoryService = {
  // Items
  getItems:        (params)      => api.get(`/inventory/items${itemsQuery(params)}`),
  getItemById:     (id)          => api.get(`/inventory/items/${id}`),
  createItem:      (data)        => api.post('/inventory/items', data),
  updateItem:      (id, data)    => api.patch(`/inventory/items/${id}`, data),
  adjustStock:     (id, data)    => api.post(`/inventory/items/${id}/adjust`, data),

  // History
  getItemHistory:  (id)          => api.get(`/inventory/items/${id}/history`),
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params)
    return api.get(`/inventory/transactions${qs.toString() ? `?${qs}` : ''}`)
  },

  // Purchases
  getPurchases:    (params)      => api.get(`/inventory/purchases${purchasesQuery(params)}`),
  getPurchaseById: (id)          => api.get(`/inventory/purchases/${id}`),
  createPurchase:  (data)        => api.post('/inventory/purchases', data),
}

export default inventoryService
