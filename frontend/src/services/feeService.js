import api from './api';

const feeService = {
  getFees: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.term) query.append('term', params.term);
    if (params.academicYear) query.append('academicYear', params.academicYear);
    if (params.classLevel) query.append('classLevel', params.classLevel);
    if (params.type) query.append('type', params.type);
    if (params.isActive !== undefined) query.append('isActive', params.isActive);
    const response = await api.get(`/fees?${query.toString()}`);
    return response.data;
  },

  getFee: async (id) => {
    const response = await api.get(`/fees/${id}`);
    return response.data;
  },

  createFee: async (feeData) => {
    const response = await api.post('/fees', feeData);
    return response.data;
  },

  updateFee: async (id, feeData) => {
    const response = await api.put(`/fees/${id}`, feeData);
    return response.data;
  },

  deleteFee: async (id) => {
    const response = await api.delete(`/fees/${id}`);
    return response.data;
  },

  getFeesSummary: async (academicYear) => {
    const response = await api.get(`/fees/summary/${academicYear}`);
    return response.data;
  },
};

export default feeService;
