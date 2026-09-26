import api from './apiClient'

const paymentsService = {
  /**
   * All payments, optionally filtered by sale_id.
   * @param {number} [saleId]
   */
  getAll:          (saleId)  => api.get(`/payments${saleId ? `?sale_id=${saleId}` : ''}`),

  /**
   * Full payment history + running balance for one sale.
   * This is the primary endpoint for the client profile payment panel.
   */
  getHistoryBySale: (saleId) => api.get(`/payments/sale/${saleId}`),

  getById:  (id)         => api.get(`/payments/${id}`),
  create:   (data)       => api.post('/payments', data),
  update:   (id, data)   => api.patch(`/payments/${id}`, data),
  delete:   (id)         => api.delete(`/payments/${id}`),
}

export default paymentsService
