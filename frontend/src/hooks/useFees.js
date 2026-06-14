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

// Set (or clear) the pro-rata category shares on a structure. Pass either
// `categories` (array of { name, percent }) or `csv` (raw text); an empty
// `categories: []` clears them.
export const useSetFeeCategories = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categories, csv }) =>
      api
        .put(`/fee-structures/${id}/categories`, csv != null ? { csv } : { categories })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY] }),
  });
};

// Generate three DRAFT structures (Term 1/2/3 at 50:30:20) from one annual
// total, each pre-filled with the standard MoE voteheads. Pass `preview: true`
// to get the computed plan back without persisting anything.
export const useGenerateFeeStructures = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/fee-structures/generate', data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      if (!variables?.preview) qc.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY] });
    },
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
