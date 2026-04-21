import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const FEE_STRUCTURES_KEY = 'feeStructures';
const STUDENT_FEES_KEY = 'studentFees';

export const useFeeStructures = (params = {}) =>
  useQuery({
    queryKey: [FEE_STRUCTURES_KEY, params],
    queryFn: () => api.get('/fee-structures', { params }).then((r) => r.data),
  });

export const useCreateFeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/fee-structures', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY] }),
  });
};

export const useUpdateFeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/fee-structures/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY] }),
  });
};

export const usePublishFeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/fee-structures/${id}/publish`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY] });
      qc.invalidateQueries({ queryKey: [STUDENT_FEES_KEY] });
    },
  });
};

export const useDeleteFeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/fee-structures/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY] }),
  });
};

export const useStudentFees = (params = {}) =>
  useQuery({
    queryKey: [STUDENT_FEES_KEY, params],
    queryFn: () => api.get('/student-fees', { params }).then((r) => r.data),
    enabled: !!params.student || !!params.term,
  });
