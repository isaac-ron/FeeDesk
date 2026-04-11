import api from './api';

const transactionService = {
  getTransactions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.source) query.append('source', params.source);
    if (params.status) query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.limit) query.append('limit', params.limit);
    const response = await api.get(`/transactions?${query.toString()}`);
    return response.data;
  },

  recordCashPayment: async (paymentData) => {
    const response = await api.post('/payments/cash', paymentData);
    return response.data;
  },

  recordBankPayment: async (paymentData) => {
    const response = await api.post('/payments/bank', paymentData);
    return response.data;
  },

  getPaymentStats: async () => {
    const response = await api.get('/payments/stats');
    return response.data;
  },
};

export default transactionService;
