import React, { useState, useEffect, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import { useOutletContext } from 'react-router-dom';
import { useDashboardStats, useRecentTransactions, useCollectionTrends, usePaymentMethodsBreakdown } from '../../hooks/useDashboard';
import { SocketContext } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContext';
import {
  mockDashboardStats,
  mockRecentTransactions,
  mockCollectionTrends,
  mockPaymentMethods,
  mockStudentAvatars
} from '../../utils/mockData';

const Dashboard = () => {
  const { openSidebar } = useOutletContext() || {};
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const schoolName = user?.school?.name || (user?.role === 'super_admin' ? 'All schools' : '');
  const [liveUpdate, setLiveUpdate] = useState(null);

  const { data: stats = mockDashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: transactions = mockRecentTransactions.slice(0, 5), isLoading: txnLoading } = useRecentTransactions(5);
  const { data: trends = mockCollectionTrends } = useCollectionTrends(30);
  const { data: paymentMethods = mockPaymentMethods } = usePaymentMethodsBreakdown();

  const loading = statsLoading || txnLoading;
  const error = statsError ? 'Using mock data - API not connected' : null;

  useEffect(() => {
    if (!socket) return;

    const handlePayment = (paymentData) => {
      setLiveUpdate({
        type: 'success',
        message: `${paymentData.source} payment of KES ${paymentData.amount.toLocaleString()} received from ${paymentData.studentName}`,
        time: Date.now()
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setLiveUpdate(null);
      }, 3000);
    };

    const handleUnknown = (paymentData) => {
      setLiveUpdate({
        type: 'warning',
        message: `Suspense: KES ${paymentData.amount.toLocaleString()} received for unknown student (Ref: ${paymentData.reference})`,
        time: Date.now()
      });
      setTimeout(() => setLiveUpdate(null), 5000);
    };

    socket.on('payment_received', handlePayment);
    socket.on('unknown_payment', handleUnknown);
    return () => {
      socket.off('payment_received', handlePayment);
      socket.off('unknown_payment', handleUnknown);
    };
  }, [socket, queryClient]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('KES', 'KES ');
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={schoolName || undefined}
        onMenuClick={openSidebar}
        actions={
          <>
            <div className="relative hidden md:flex items-center w-72 h-11 bg-slate-50 border border-surface-border rounded-full overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <div className="pl-4 pr-2 text-text-muted flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                className="w-full bg-transparent border-none text-text-main text-sm placeholder:text-text-muted focus:ring-0 focus:outline-none h-full"
                placeholder="Search student or adm no..."
              />
            </div>
            <button className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-900/10">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Record Payment</span>
            </button>
            <button className="size-11 flex items-center justify-center rounded-full bg-white border border-surface-border text-text-muted hover:text-primary hover:bg-slate-50 transition-all relative shadow-sm">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2.5 right-3 size-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
        {/* Live Update Notification */}
        {liveUpdate && (
          <div className={`${
            liveUpdate.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-orange-50 border-orange-500 text-orange-800'
          } border-l-4 rounded-lg p-4 flex items-center gap-3 animate-slide-in shadow-lg`}>
            <div className="flex items-center justify-center size-10 rounded-full bg-white shadow-sm">
              <span className={`material-symbols-outlined ${liveUpdate.type === 'success' ? 'text-green-600' : 'text-orange-600'}`}>
                {liveUpdate.type === 'success' ? 'check_circle' : 'info'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">LIVE UPDATE</p>
              <p className="text-sm font-medium">{liveUpdate.message}</p>
            </div>
            <span className="text-xs font-mono opacity-50">just now</span>
          </div>
        )}
        
        {/* Error Banner */}
        {error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-600">info</span>
            <span className="text-blue-800 text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Total Collected Today */}
              <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <span className="material-symbols-outlined text-8xl text-primary">payments</span>
                </div>
                <div className="flex flex-col gap-2 z-10">
                  <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Collected Today</p>
                  <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                    {formatCurrency(stats.totalCollectedToday)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-5 z-10">
                  <div className="bg-success/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-success text-sm">
                      {stats.totalCollectedTodayChange >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    <p className={`text-sm font-bold ${stats.totalCollectedTodayChange >= 0 ? 'text-success' : 'text-red-600'}`}>
                      {stats.totalCollectedTodayChange >= 0 ? '+' : ''}{stats.totalCollectedTodayChange}%
                    </p>
                  </div>
                  <p className="text-text-muted text-xs font-medium">vs yesterday</p>
                </div>
              </div>

              {/* Outstanding Balance */}
              <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                  <span className="material-symbols-outlined text-8xl text-primary">account_balance_wallet</span>
                </div>
                <div className="flex flex-col gap-2 z-10">
                  <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Outstanding Balance</p>
                  <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                    {formatCurrency(stats.outstandingBalance)}
                  </p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-6">
                  <div 
                    className="bg-orange-500 h-2 rounded-full shadow-sm" 
                    style={{width: `${stats.outstandingPercentage}%`}}
                  ></div>
                </div>
                <p className="text-text-muted text-xs mt-2 font-medium">
                  {stats.outstandingPercentage}% pending collection
                </p>
              </div>

              {/* Active Students */}
              <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                  <span className="material-symbols-outlined text-8xl text-primary">groups</span>
                </div>
                <div className="flex flex-col gap-2 z-10">
                  <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Active Students</p>
                  <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                    {formatNumber(stats.activeStudents)}
                  </p>
                </div>
                <div className="mt-5 flex -space-x-3">
                  {mockStudentAvatars.map((avatar, index) => (
                    <div 
                      key={index}
                      className="size-9 rounded-full bg-slate-200 border-2 border-white shadow-sm bg-cover bg-center" 
                      style={{backgroundImage: `url("${avatar}")`}}
                    ></div>
                  ))}
                  <div className="size-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-text-muted font-bold shadow-sm">
                    +{stats.activeStudents - 3}
                  </div>
                </div>
              </div>

              {/* SMS Sent */}
              <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                  <span className="material-symbols-outlined text-8xl text-primary">sms</span>
                </div>
                <div className="flex flex-col gap-2 z-10">
                  <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">SMS Sent</p>
                  <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                    {formatNumber(stats.smsSent)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-5 z-10">
                  <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                  <p className="text-text-muted text-xs font-medium">
                    {stats.systemStatus === 'operational' ? 'All systems operational' : 'System issues detected'}
                  </p>
                </div>
              </div>
            </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fee Collection Trends - Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-surface-border bg-white p-6 flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-text-main text-xl font-bold font-display">Fee Collection Trends</h3>
                <p className="text-text-muted text-sm mt-1">Last 30 Days &middot; Daily breakdown</p>
              </div>
              <div className="text-right">
                <p className="text-primary text-2xl font-bold tracking-tight font-display">
                  {formatCurrency(trends.totalRevenue)}
                </p>
                <p className="text-text-muted text-xs uppercase tracking-wider font-bold">Revenue</p>
              </div>
            </div>
            {/* Bar chart */}
            {(() => {
              const data = trends.dailyData || [];
              const maxAmount = Math.max(...data.map(d => d.amount), 1);
              const avgAmount = data.length > 0 ? data.reduce((s, d) => s + d.amount, 0) / data.length : 0;

              return (
                <div className="flex-1 w-full min-h-[250px] relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-[10px] text-text-muted font-medium pointer-events-none">
                    <span>{(maxAmount / 1000).toFixed(0)}K</span>
                    <span>{(maxAmount / 2000).toFixed(0)}K</span>
                    <span>0</span>
                  </div>
                  {/* Bars container */}
                  <div className="ml-16 h-full flex flex-col">
                    <div className="flex-1 relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-dashed border-slate-200"></div>
                        <div className="border-b border-dashed border-slate-200"></div>
                        <div className="border-b border-slate-200"></div>
                      </div>
                      {/* Average line */}
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-orange-300 pointer-events-none z-10"
                        style={{ top: `${((1 - avgAmount / maxAmount) * 100).toFixed(1)}%` }}
                      >
                        <span className="absolute -top-4 right-0 text-[10px] text-orange-500 font-bold bg-white px-1 rounded">
                          Avg {(avgAmount / 1000).toFixed(0)}K
                        </span>
                      </div>
                      {/* Bars */}
                      <div className="absolute inset-0 flex items-end gap-[2px] px-0.5">
                        {data.map((d, i) => {
                          const heightPct = (d.amount / maxAmount) * 100;
                          const isWeekend = d.day % 7 === 6 || d.day % 7 === 0;
                          const isMax = d.amount === maxAmount;
                          const isToday = i === data.length - 1;
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center group relative" style={{ height: '100%' }}>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20">
                                <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap font-medium shadow-lg">
                                  <span className="font-bold">Day {d.day}</span>
                                  <br />
                                  {formatCurrency(d.amount)}
                                </div>
                                <div className="size-2 bg-slate-800 rotate-45 -mt-1"></div>
                              </div>
                              <div className="w-full mt-auto relative">
                                <div
                                  className={`w-full rounded-t-sm transition-all duration-200 group-hover:opacity-90 ${
                                    isToday
                                      ? 'bg-green-500 shadow-sm shadow-green-200'
                                      : isMax
                                      ? 'bg-primary shadow-sm shadow-blue-200'
                                      : isWeekend
                                      ? 'bg-slate-300'
                                      : 'bg-primary/70'
                                  }`}
                                  style={{ height: `${heightPct}%`, minHeight: '2px' }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* X-axis labels */}
                    <div className="flex justify-between text-text-muted text-[10px] font-bold mt-2 pt-2 border-t border-slate-100 uppercase tracking-wide">
                      {trends.weeks.map((week, index) => (
                        <span key={index}>{week.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Legend */}
            <div className="flex items-center gap-5 mt-3 text-[11px] text-text-muted font-medium">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary/70"></span>Weekday</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-300"></span>Weekend</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-green-500"></span>Today</span>
              <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-orange-300"></span>Average</span>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="rounded-2xl border border-surface-border bg-white p-6 flex flex-col shadow-sm">
            <h3 className="text-text-main text-xl font-bold font-display mb-1">Payment Methods</h3>
            <p className="text-text-muted text-sm mb-6">Distribution by channel</p>
            {/* Donut chart */}
            <div className="flex-1 flex items-center justify-center relative my-2">
              <div
                className="size-48 rounded-full relative"
                style={{background: `conic-gradient(#1e3a8a 0% ${paymentMethods.mpesa.percentage}%, #94a3b8 ${paymentMethods.mpesa.percentage}% 100%)`}}
              >
                <div className="absolute inset-7 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-inner">
                  <span className="text-sm text-text-muted font-bold uppercase tracking-wider">Total</span>
                  <span className="text-lg font-extrabold text-text-main font-display mt-0.5">
                    {formatNumber((paymentMethods.mpesa.count || 0) + (paymentMethods.bank.count || 0))}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium mt-0.5">transactions</span>
                </div>
              </div>
            </div>
            {/* Method details */}
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
              {/* MPESA */}
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full bg-primary flex-shrink-0"></span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-main font-semibold">MPESA</span>
                    <span className="text-sm text-text-main font-bold">{paymentMethods.mpesa.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{width: `${paymentMethods.mpesa.percentage}%`}}></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-text-muted">{formatCurrency(paymentMethods.mpesa.amount)}</span>
                    <span className="text-[11px] text-text-muted">{formatNumber(paymentMethods.mpesa.count || 0)} txns</span>
                  </div>
                </div>
              </div>
              {/* Bank */}
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full bg-slate-400 flex-shrink-0"></span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-main font-semibold">Bank Transfer</span>
                    <span className="text-sm text-text-main font-bold">{paymentMethods.bank.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5">
                    <div className="bg-slate-400 h-1.5 rounded-full transition-all duration-500" style={{width: `${paymentMethods.bank.percentage}%`}}></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-text-muted">{formatCurrency(paymentMethods.bank.amount)}</span>
                    <span className="text-[11px] text-text-muted">{formatNumber(paymentMethods.bank.count || 0)} txns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transactions Feed */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-text-main text-xl font-bold tracking-tight font-display">Live Transactions Feed</h3>
            <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
              View All
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          <div className="rounded-2xl border border-surface-border bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-surface-border text-text-muted text-xs uppercase tracking-wider font-bold">
                    <th className="p-5 pl-8 font-semibold">Transaction ID</th>
                    <th className="p-5 font-semibold">Student Name</th>
                    <th className="p-5 font-semibold">Amount</th>
                    <th className="p-5 font-semibold">Source</th>
                    <th className="p-5 pr-8 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-surface-border">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-8 text-text-main font-mono text-xs font-medium">#{transaction.id}</td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="text-text-main font-bold">{transaction.studentName}</span>
                          <span className="text-text-muted text-xs">Adm: {transaction.admissionNumber}</span>
                        </div>
                      </td>
                      <td className="p-5 text-success font-extrabold text-base">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                          transaction.source === 'MPESA' 
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {transaction.source}
                        </span>
                      </td>
                      <td className="p-5 pr-8 text-text-muted text-right font-medium">{transaction.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </>
        )}

        <div className="h-8"></div>
      </div>
    </>
  );
};

export default Dashboard;

