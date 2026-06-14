import React, { useState, useEffect, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useDashboardStats, useRecentTransactions, useCollectionTrends, usePaymentMethodsBreakdown } from '../../hooks/useDashboard';
import { SocketContext } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContext';
import {
  mockDashboardStats,
  mockRecentTransactions,
  mockTrendRanges,
  mockPaymentMethods
} from '../../utils/mockData';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0).replace('KES', 'KES ');

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

// Compact axis/average formatter — 1.2M, 145K, etc.
const fmtShort = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n || 0));
};

const TREND_RANGES = ['30d', 'Term', 'Year'];

// Fee-collection trends with the 30d / Term / Year range filter. Holds its own
// `range` state and re-queries via useCollectionTrends, falling back to mock
// shapes when the API is unavailable.
const TrendChart = () => {
  const [range, setRange] = useState('30d');
  const { data: cfg = mockTrendRanges[range] } = useCollectionTrends(range);

  const data = cfg?.data?.length ? cfg.data : mockTrendRanges[range].data;
  const xlabels = cfg?.xlabels?.length ? cfg.xlabels : mockTrendRanges[range].xlabels;
  const total = cfg?.total ?? mockTrendRanges[range].total;
  const totalLabel = cfg?.totalLabel ?? mockTrendRanges[range].totalLabel;
  const sub = cfg?.sub ?? mockTrendRanges[range].sub;

  const max = Math.max(...data, 1);
  const avg = data.length ? data.reduce((s, v) => s + v, 0) / data.length : 0;

  return (
    <div className="flex-[2] min-w-0 flex flex-col rounded-[18px] border border-line bg-white p-6 shadow-[0_1px_2px_rgba(12,16,24,0.04)]">
      {/* Header: title + range filter + total */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[17px] font-extrabold tracking-tight text-text-main font-display">Fee collection trends</h3>
          <p className="text-[12.5px] text-text-muted mt-0.5">{sub}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-0.5 rounded-full bg-paper-2 p-[3px]">
            {TREND_RANGES.map((r) => {
              const on = r === range;
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-[15px] py-1.5 rounded-full text-xs font-bold transition-all ${
                    on
                      ? 'bg-primary text-white shadow-[0_2px_6px_rgba(18,81,163,0.28)]'
                      : 'bg-transparent text-text-muted hover:text-text-main'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <div className="text-right whitespace-nowrap">
            <span className="text-[21px] font-extrabold tracking-tight text-primary tabular-nums font-display">{formatCurrency(total)}</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-fd-gray-400">{totalLabel}</span>
          </div>
        </div>
      </div>

      {/* Plot area */}
      <div className="flex-1 relative pl-[38px]">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-[22px] flex flex-col justify-between text-[10px] font-semibold text-fd-gray-400 pointer-events-none">
          <span>{fmtShort(max)}</span>
          <span>{fmtShort(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative h-[200px]">
          {/* Gridlines */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-dashed border-[#EEF1F4]" style={{ top: `${i * 50}%` }} />
          ))}
          {/* Average line */}
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-[#F0B574] z-[2]" style={{ top: `${(1 - avg / max) * 100}%` }}>
            <span className="absolute right-0 -top-4 text-[9.5px] font-bold text-[#D97706] bg-white px-1">Avg {fmtShort(avg)}</span>
          </div>
          {/* Bars */}
          <div className="absolute inset-0 flex items-end" style={{ gap: range === '30d' ? 3 : 6 }}>
            {data.map((v, i) => {
              const isLast = i === data.length - 1;
              const isMax = v === max;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t group relative"
                  style={{
                    height: `${(v / max) * 100}%`,
                    minHeight: 2,
                    opacity: isLast || isMax ? 1 : 0.85,
                    background: isLast
                      ? 'linear-gradient(180deg,#16A34A,#15A04790)'
                      : isMax
                      ? 'linear-gradient(180deg,#1251A3,#1251A370)'
                      : 'linear-gradient(180deg,#5CB8FF,#93D0FF)',
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 whitespace-nowrap rounded-lg bg-text-main px-2.5 py-1.5 text-[10px] font-medium text-white shadow-lg">
                    {formatCurrency(v)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 pt-2 border-t border-line text-[10px] font-bold uppercase tracking-wide text-fd-gray-400">
          {xlabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-[18px] mt-3.5 text-[11px] font-semibold text-text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary-light" />This period</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Peak</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" />Latest</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-[#F0B574]" />Average</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { openSidebar } = useOutletContext() || {};
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const schoolName = user?.school?.name || (user?.role === 'super_admin' ? 'All schools' : '');
  const [liveUpdate, setLiveUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/students?q=${encodeURIComponent(q)}` : '/students');
  };

  const { data: stats = mockDashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: transactions = mockRecentTransactions.slice(0, 5), isLoading: txnLoading } = useRecentTransactions(5);
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

  // Hero-strip derived figures. billedTerm falls back to collected + outstanding
  // if the API omits it; progressPct is collected / billed.
  const collectedTerm = stats.collectedTerm ?? stats.totalCollectedToday ?? 0;
  const billedTerm = stats.billedTerm ?? (collectedTerm + (stats.outstandingBalance || 0));
  const progressPct = billedTerm > 0 ? Math.round((collectedTerm / billedTerm) * 100) : 0;
  const studentsOwing = stats.studentsOwing ?? 0;
  const studentsCleared = stats.studentsCleared ?? Math.max(0, (stats.activeStudents || 0) - studentsOwing);

  const totalTxns = (paymentMethods.mpesa?.count || 0) + (paymentMethods.bank?.count || 0);

  return (
    <>
      <PageHeader
        title={schoolName ? `${schoolName} Dashboard` : 'Dashboard'}
        subtitle="Overview of recent activity and key metrics"
        onMenuClick={openSidebar}
        actions={
          <>
            <form onSubmit={onSearch} className="relative hidden md:flex items-center w-72 h-11 bg-white border border-line rounded-lg overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <button type="submit" className="pl-4 pr-2 text-text-muted flex items-center justify-center hover:text-primary" aria-label="Search students">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-text-main text-sm placeholder:text-text-muted focus:ring-0 focus:outline-none h-full pr-3"
                placeholder="Search student or adm no..."
              />
            </form>
            <button
              onClick={() => navigate('/finance')}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Record Payment</span>
            </button>
            <button
              onClick={() => navigate('/finance/suspense')}
              title="Payments needing attention"
              className="size-11 flex items-center justify-center rounded-lg bg-white border border-line text-text-muted hover:text-primary hover:bg-paper-2 transition-all relative"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2.5 right-3 size-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-[22px] bg-paper">
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
            {/* 1 · Term-collection progress hero strip */}
            <div className="flex flex-wrap items-center gap-7 rounded-[20px] px-7 py-6 text-white bg-[linear-gradient(115deg,#103A7A,#1251A3_55%,#1A65C9)] shadow-[0_14px_34px_rgba(18,81,163,0.28)]">
              <div className="flex-1 min-w-[260px]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-fd-blue-200">Term collection progress</div>
                <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
                  <span className="text-[34px] font-extrabold tracking-tight leading-none font-display">{formatCurrency(collectedTerm)}</span>
                  <span className="text-sm font-semibold text-fd-blue-100">of {formatCurrency(billedTerm)} billed</span>
                </div>
                <div className="mt-3.5 h-[9px] rounded-full overflow-hidden bg-white/[0.18]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#5CB8FF,#C7E8FF)]" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="hidden sm:block w-px h-14 bg-white/[0.18]" />
              <div className="text-center">
                <div className="text-[40px] font-extrabold tracking-tight leading-none font-display">{progressPct}%</div>
                <div className="text-[11.5px] font-semibold text-fd-blue-200 mt-1">collected</div>
              </div>
              <div className="hidden sm:block w-px h-14 bg-white/[0.18]" />
              <div className="text-center">
                <div className="text-[40px] font-extrabold tracking-tight leading-none font-display">{formatNumber(studentsOwing)}</div>
                <div className="text-[11.5px] font-semibold text-fd-blue-200 mt-1">students owing</div>
              </div>
            </div>

            {/* 2 · Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[18px]">
              {/* Collected today */}
              <div className="relative overflow-hidden rounded-[18px] border border-line bg-white p-[22px] shadow-[0_1px_2px_rgba(12,16,24,0.04)] hover:shadow-[0_4px_16px_rgba(12,16,24,0.06)] transition-shadow">
                <span className="material-symbols-outlined absolute -top-2 -right-2 text-8xl text-primary opacity-[0.04] pointer-events-none">payments</span>
                <p className="text-[11px] font-bold uppercase tracking-wide text-fd-gray-400">Collected today</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-main tabular-nums font-display">{formatCurrency(stats.totalCollectedToday)}</p>
                <div className="flex items-center gap-1.5 mt-3.5 text-[12.5px]">
                  <span className="flex items-center gap-1 rounded-full bg-success/10 text-success font-bold px-2 py-0.5">
                    <span className="material-symbols-outlined text-[15px]">
                      {stats.totalCollectedTodayChange >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {stats.totalCollectedTodayChange >= 0 ? '+' : ''}{stats.totalCollectedTodayChange}%
                  </span>
                  <span className="text-fd-gray-400 font-medium">vs yesterday</span>
                </div>
              </div>

              {/* Outstanding balance */}
              <div className="relative overflow-hidden rounded-[18px] border border-line bg-white p-[22px] shadow-[0_1px_2px_rgba(12,16,24,0.04)] hover:shadow-[0_4px_16px_rgba(12,16,24,0.06)] transition-shadow">
                <span className="material-symbols-outlined absolute -top-2 -right-2 text-8xl text-primary opacity-[0.04] pointer-events-none">account_balance_wallet</span>
                <p className="text-[11px] font-bold uppercase tracking-wide text-fd-gray-400">Outstanding balance</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-main tabular-nums font-display">{formatCurrency(stats.outstandingBalance)}</p>
                <div className="mt-3.5 h-[7px] rounded-full bg-paper-2 overflow-hidden">
                  <div className="h-full rounded-full bg-[#D97706]" style={{ width: `${stats.outstandingPercentage}%` }} />
                </div>
                <p className="mt-1.5 text-[11.5px] font-medium text-fd-gray-400">{stats.outstandingPercentage}% pending collection</p>
              </div>

              {/* Active students */}
              <div className="relative overflow-hidden rounded-[18px] border border-line bg-white p-[22px] shadow-[0_1px_2px_rgba(12,16,24,0.04)] hover:shadow-[0_4px_16px_rgba(12,16,24,0.06)] transition-shadow">
                <span className="material-symbols-outlined absolute -top-2 -right-2 text-8xl text-primary opacity-[0.04] pointer-events-none">groups</span>
                <p className="text-[11px] font-bold uppercase tracking-wide text-fd-gray-400">Active students</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-main tabular-nums font-display">{formatNumber(stats.activeStudents)}</p>
                <div className="flex items-center gap-2 mt-3.5 text-[12.5px] font-medium text-text-muted">
                  <span className="text-success font-bold">{formatNumber(studentsCleared)} cleared</span>
                  ·
                  <span className="text-[#D97706] font-bold">{formatNumber(studentsOwing)} owing</span>
                </div>
              </div>

              {/* SMS reminders sent */}
              <div className="relative overflow-hidden rounded-[18px] border border-line bg-white p-[22px] shadow-[0_1px_2px_rgba(12,16,24,0.04)] hover:shadow-[0_4px_16px_rgba(12,16,24,0.06)] transition-shadow">
                <span className="material-symbols-outlined absolute -top-2 -right-2 text-8xl text-primary opacity-[0.04] pointer-events-none">sms</span>
                <p className="text-[11px] font-bold uppercase tracking-wide text-fd-gray-400">SMS reminders sent</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-main tabular-nums font-display">{formatNumber(stats.smsSent)}</p>
                <div className="flex items-center gap-1.5 mt-3.5 text-[12.5px] font-medium text-text-muted">
                  <span className="material-symbols-outlined text-[16px] text-success">check_circle</span>
                  {stats.systemStatus === 'operational' ? 'All systems operational' : 'System issues detected'}
                </div>
              </div>
            </div>

            {/* 3 · Charts row */}
            <div className="flex flex-col lg:flex-row gap-[18px]">
              <TrendChart />

              {/* Payment methods donut */}
              <div className="flex-1 min-w-0 flex flex-col rounded-[18px] border border-line bg-white p-6 shadow-[0_1px_2px_rgba(12,16,24,0.04)]">
                <h3 className="text-[17px] font-extrabold tracking-tight text-text-main font-display">Payment methods</h3>
                <p className="text-[12.5px] text-text-muted mt-0.5">Distribution by channel</p>
                <div className="flex-1 flex items-center justify-center py-[18px]">
                  <div
                    className="size-[168px] rounded-full relative"
                    style={{ background: `conic-gradient(#1251A3 0 ${paymentMethods.mpesa?.percentage || 0}%, #C7E8FF ${paymentMethods.mpesa?.percentage || 0}% 100%)` }}
                  >
                    <div className="absolute inset-[26px] bg-white rounded-full flex flex-col items-center justify-center shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-fd-gray-400">Total</span>
                      <span className="text-2xl font-extrabold tracking-tight text-text-main font-display">{formatNumber(totalTxns)}</span>
                      <span className="text-[10.5px] font-medium text-fd-gray-400">transactions</span>
                    </div>
                  </div>
                </div>
                {[
                  { k: 'MPESA', dot: 'bg-primary', d: paymentMethods.mpesa },
                  { k: 'Bank transfer', dot: 'bg-fd-blue-100', d: paymentMethods.bank },
                ].map((m) => (
                  <div key={m.k} className="pt-3 mt-3 border-t border-line">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[13.5px] font-bold text-text-main">
                        <span className={`size-[11px] rounded-sm ${m.dot}`} />{m.k}
                      </span>
                      <span className="text-[13.5px] font-extrabold text-text-main">{m.d?.percentage || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-text-muted">
                      <span>{formatCurrency(m.d?.amount)}</span>
                      <span>{formatNumber(m.d?.count || 0)} txns</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 · Live transactions */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-extrabold tracking-tight text-text-main font-display">Live transactions</h3>
                  <span className="flex items-center gap-1.5 rounded-full bg-success/[0.08] text-success text-[11px] font-bold px-2.5 py-[3px]">
                    <span className="size-1.5 rounded-full bg-success" /> Live
                  </span>
                </div>
                <button onClick={() => navigate('/finance')} className="flex items-center gap-1 text-primary text-[13px] font-bold hover:underline">
                  View all
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
              <div className="rounded-[18px] border border-line bg-white overflow-hidden shadow-[0_1px_2px_rgba(12,16,24,0.04)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[13.5px]">
                    <thead>
                      <tr className="bg-paper border-b border-line text-fd-gray-400 text-[10.5px] uppercase tracking-wide font-bold">
                        <th className="px-5 py-3.5 font-bold">Reference</th>
                        <th className="px-5 py-3.5 font-bold">Student</th>
                        <th className="px-5 py-3.5 font-bold">Amount</th>
                        <th className="px-5 py-3.5 font-bold">Channel</th>
                        <th className="px-5 py-3.5 font-bold text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {transactions.map((transaction) => {
                        const isMpesa = transaction.source === 'MPESA';
                        return (
                          <tr key={transaction.id} className="hover:bg-paper transition-colors">
                            <td className="px-5 py-3.5 font-mono-brand text-xs text-text-muted">{transaction.id}</td>
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-text-main">{transaction.studentName}</div>
                              <div className="text-[11.5px] text-fd-gray-400">Adm {transaction.admissionNumber}</div>
                            </td>
                            <td className="px-5 py-3.5 font-extrabold text-success tabular-nums">{formatCurrency(transaction.amount)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isMpesa ? 'bg-success/[0.08] text-success' : 'bg-primary/[0.07] text-primary'
                              }`}>
                                {transaction.source}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium text-fd-gray-400">{transaction.time}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-4"></div>
      </div>
    </>
  );
};

export default Dashboard;
