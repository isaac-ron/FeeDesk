import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import transactionService from '../services/transactionService';

const TXN_KEY = 'transactions';

export const useTransactions = (params = {}) =>
  useQuery({
    queryKey: [TXN_KEY, params],
    queryFn: () => transactionService.getTransactions(params),
  });

export const usePaymentStats = () =>
  useQuery({
    queryKey: [TXN_KEY, 'stats'],
    queryFn: () => transactionService.getPaymentStats(),
  });

export const useRecordCashPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => transactionService.recordCashPayment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TXN_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useRecordBankPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => transactionService.recordBankPayment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TXN_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
