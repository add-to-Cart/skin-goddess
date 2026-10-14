import api from './apiClient'

const BASE = '/auth/users'

const usersService = {
  getAll: ()              => api.get(BASE),
  create: (data)          => api.post(BASE, data),
  update: (id, data)      => api.patch(`${BASE}/${id}`, data),
  remove: (id)            => api.delete(`${BASE}/${id}`),
}

export default usersService
