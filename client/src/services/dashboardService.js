import api from './apiClient'

const dashboardService = {
  /**
   * GET /api/dashboard
   * Returns today's summary: sales, clients, payments, follow-ups,
   * low-stock items, expenses, attendance.
   */
  getSummary: () => api.get('/dashboard'),
}

export default dashboardService
