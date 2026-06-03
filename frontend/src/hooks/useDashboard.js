import { useQuery } from '@tanstack/react-query';
import dashboardService from '../services/dashboardService';

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getDashboardStats(),
  });

export const useRecentTransactions = (limit = 5) =>
  useQuery({
    queryKey: ['dashboard', 'transactions', limit],
    queryFn: () => dashboardService.getRecentTransactions(limit),
  });

export const useCollectionTrends = (range = '30d') =>
  useQuery({
    queryKey: ['dashboard', 'trends', range],
    queryFn: () => dashboardService.getCollectionTrends(range),
  });

export const usePaymentMethodsBreakdown = () =>
  useQuery({
    queryKey: ['dashboard', 'paymentMethods'],
    queryFn: () => dashboardService.getPaymentMethodsBreakdown(),
  });
