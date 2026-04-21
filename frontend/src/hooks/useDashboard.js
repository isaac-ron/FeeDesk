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

export const useCollectionTrends = (days = 30) =>
  useQuery({
    queryKey: ['dashboard', 'trends', days],
    queryFn: () => dashboardService.getCollectionTrends(days),
  });

export const usePaymentMethodsBreakdown = () =>
  useQuery({
    queryKey: ['dashboard', 'paymentMethods'],
    queryFn: () => dashboardService.getPaymentMethodsBreakdown(),
  });
