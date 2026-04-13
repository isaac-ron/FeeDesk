import api from './api';

export const platformService = {
  getStats: async () => {
    const response = await api.get('/schools/stats/platform');
    return response.data;
  },

  listSchools: async (params = {}) => {
    const response = await api.get('/schools', { params });
    return response.data;
  },

  getSchool: async (id) => {
    const response = await api.get(`/schools/${id}`);
    return response.data;
  },

  createSchool: async (payload) => {
    const response = await api.post('/schools', payload);
    return response.data;
  },

  updateSchool: async (id, payload) => {
    const response = await api.put(`/schools/${id}`, payload);
    return response.data;
  },

  deactivateSchool: async (id) => {
    const response = await api.delete(`/schools/${id}`);
    return response.data;
  },

  updateSubscription: async (id, payload) => {
    const response = await api.put(`/schools/${id}/subscription`, payload);
    return response.data;
  },

  getSchoolUsers: async (id) => {
    const response = await api.get(`/schools/${id}/users`);
    return response.data;
  },

  getPlatformSettings: async () => {
    const response = await api.get('/platform/settings');
    return response.data;
  },

  updatePlatformSettings: async (payload) => {
    const response = await api.put('/platform/settings', payload);
    return response.data;
  },
};

export default platformService;
