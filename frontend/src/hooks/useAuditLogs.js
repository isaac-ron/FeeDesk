import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const AUDIT_KEY = 'audit-logs';

export const useAuditLogs = (params = {}) =>
  useQuery({
    queryKey: [AUDIT_KEY, params],
    queryFn: async () => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, v);
      });
      const { data } = await api.get(`/audit-logs?${q.toString()}`);
      return data;
    },
    keepPreviousData: true,
  });
