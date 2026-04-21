import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useStudentLedger = (studentId, params = {}) =>
  useQuery({
    queryKey: ['studentLedger', studentId, params],
    queryFn: () => api.get(`/students/${studentId}/ledger`, { params }).then((r) => r.data),
    enabled: !!studentId,
  });
