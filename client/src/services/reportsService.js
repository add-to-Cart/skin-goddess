import api from './apiClient'

const reportsService = {
  // Sales
  salesDaily:  (date)                 => api.get(`/reports/sales/daily?report_date=${date}`),
  salesRange:  (dateFrom, dateTo)     => api.get(`/reports/sales/range?date_from=${dateFrom}&date_to=${dateTo}`),

  // Expenses
  expensesDaily:      (date)          => api.get(`/reports/expenses/daily?report_date=${date}`),
  expensesRange:      (dateFrom, dateTo) => api.get(`/reports/expenses/range?date_from=${dateFrom}&date_to=${dateTo}`),
  expensesByCategory: (params = {})   => {
    const qs = new URLSearchParams()
    if (params.date_from) qs.set('date_from', params.date_from)
    if (params.date_to)   qs.set('date_to',   params.date_to)
    return api.get(`/reports/expenses/by-category${qs.toString() ? `?${qs}` : ''}`)
  },

  // Inventory
  inventoryCurrentStock:       ()               => api.get('/reports/inventory/current-stock'),
  inventoryUsageByProcedure:   (params = {})    => {
    const qs = new URLSearchParams()
    if (params.date_from) qs.set('date_from', params.date_from)
    if (params.date_to)   qs.set('date_to',   params.date_to)
    return api.get(`/reports/inventory/usage-by-procedure${qs.toString() ? `?${qs}` : ''}`)
  },
  inventoryUsageByClient:      (clientId)       =>
    api.get(`/reports/inventory/usage-by-client${clientId ? `?client_id=${clientId}` : ''}`),

  // Clients
  outstandingBalances: ()             => api.get('/reports/clients/outstanding-balances'),
  clientFollowUps:     (status)       =>
    api.get(`/reports/clients/follow-ups${status ? `?status=${status}` : ''}`),
}

export default reportsService
