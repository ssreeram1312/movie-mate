import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Media API ────────────────────────────────────────────────────────────

export const mediaAPI = {
  list: (params = {}) => api.get('/media', { params }),
  get: (id) => api.get(`/media/${id}`),
  create: (data) => api.post('/media', data),
  update: (id, data) => api.put(`/media/${id}`, data),
  delete: (id) => api.delete(`/media/${id}`),
  updateProgress: (id, episodes_watched) =>
    api.put(`/media/${id}/progress`, { episodes_watched }),
  rate: (id, rating, review) =>
    api.put(`/media/${id}/rate`, { rating, review }),
}

// ─── TMDB API ─────────────────────────────────────────────────────────────

export const tmdbAPI = {
  search: (query, type) => api.get(`/tmdb/search`, { params: { q: query, type } }),
  getDetails: (id, type) => api.get(`/tmdb/details/${id}`, { params: { type } }),
}



// ─── AI API ───────────────────────────────────────────────────────────────

export const aiAPI = {
  getRecommendations: () => api.get('/ai/recommendations'),
  generateReview: (data) => api.post('/ai/generate-review', data),
  estimateCompletion: (id) => api.get(`/ai/estimate-completion/${id}`),
  getStats: () => api.get('/stats/summary'),
}

// ─── Stats API ────────────────────────────────────────────────────────────

export const statsAPI = {
  getWatchTime: (period = 'weekly') => api.get('/stats/watch-time', { params: { period } }),
  getSummary: () => api.get('/stats/summary'),
  suggestWatchParty: (data) => api.post('/watch-party/suggest', data),
}

export default api
