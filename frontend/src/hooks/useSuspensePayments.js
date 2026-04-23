import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const KEY = 'suspense-payments';

// Lists both unmatched (student=null) and unallocated (student set, no
// allocations) credit transactions for the current school.
export const useSuspensePayments = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data } = await api.get('/payments/unmatched');
      return data.data || [];
    },
  });

const invalidateAll = (qc) => {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['students'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['student-ledger'] });
};

// Match an UNMATCHED payment (no student) to a student — runs allocation.
export const useMatchPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, studentId }) => {
      const { data } = await api.patch(`/payments/${transactionId}/match`, { studentId });
      return data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
};

// Allocate an already-matched payment that landed before fees were published.
export const useAllocatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId }) => {
      const { data } = await api.post(`/payments/${transactionId}/allocate`);
      return data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
};
