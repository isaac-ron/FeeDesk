import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import api from '../../services/api';

const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const YEAR_COLORS = ['#C7E8FF', '#93D0FF', '#5CB8FF', '#1251A3']; // oldest → newest
const fmtShort = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n || 0));
const fmtKES = (n) => `KES ${new Intl.NumberFormat('en-KE').format(Math.round(n || 0))}`;

// Multi-year, year-over-year collections — the analytical centerpiece of the
// reports page. One line per calendar year over 12 months, plus a per-term
// breakdown table across years.
const MultiYearTrends = ({ trends }) => {
  if (!trends?.years?.length) return null;
  const { years, monthly, byYear, yoyPercent } = trends;

  const W = 760, H = 248, padL = 46, padR = 16, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(...years.flatMap((y) => monthly[y]), 1);
  const xAt = (m) => padL + (m / 11) * plotW;
  const yAt = (v) => padT + (1 - v / max) * plotH;
  const colorFor = (idx) => YEAR_COLORS[YEAR_COLORS.length - 1 - (years.length - 1 - idx)] || YEAR_COLORS[0];
  const newest = years.length - 1;

  return (
    <div className="bg-white border border-line rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-header text-lg font-bold text-ink">Collections, year over year</h3>
          <p className="text-sm text-body">Monthly collected, last {years.length} years</p>
        </div>
        {yoyPercent != null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${yoyPercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <span className="material-symbols-outlined text-[18px]">{yoyPercent >= 0 ? 'trending_up' : 'trending_down'}</span>
            {yoyPercent >= 0 ? '+' : ''}{yoyPercent}% vs {years[newest - 1]}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Year over year collections">
        {/* gridlines + y labels */}
        {[0, 0.5, 1].map((f, i) => {
          const gy = padT + (1 - f) * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#E5E3DB" strokeDasharray="3 3" />
              <text x={padL - 8} y={gy + 3} textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="600">{fmtShort(max * f)}</text>
            </g>
          );
        })}
        {/* month ticks */}
        {MONTHS_SHORT.map((m, i) => (
          <text key={i} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontWeight="700">{m}</text>
        ))}
        {/* one polyline per year */}
        {years.map((yr, idx) => (
          <polyline
            key={yr}
            fill="none"
            stroke={colorFor(idx)}
            strokeWidth={idx === newest ? 2.75 : 1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={monthly[yr].map((v, m) => `${xAt(m)},${yAt(v)}`).join(' ')}
            opacity={idx === newest ? 1 : 0.85}
          />
        ))}
      </svg>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3">
        {years.map((yr, idx) => (
          <span key={yr} className="flex items-center gap-1.5 text-xs font-semibold text-body">
            <span className="w-3.5 h-[3px] rounded-full" style={{ background: colorFor(idx) }} />
            {yr}
          </span>
        ))}
      </div>

      {/* per-term breakdown across years */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono-brand text-[11px] uppercase tracking-wide text-body border-b border-line">
              <th className="py-2 pr-4 font-medium">Year</th>
              <th className="py-2 px-4 font-medium text-right">Term 1</th>
              <th className="py-2 px-4 font-medium text-right">Term 2</th>
              <th className="py-2 px-4 font-medium text-right">Term 3</th>
              <th className="py-2 pl-4 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...byYear].reverse().map((r) => (
              <tr key={r.year}>
                <td className="py-2.5 pr-4 font-bold text-ink">{r.year}</td>
                <td className="py-2.5 px-4 text-right text-body tabular-nums">{fmtKES(r.term1)}</td>
                <td className="py-2.5 px-4 text-right text-body tabular-nums">{fmtKES(r.term2)}</td>
                <td className="py-2.5 px-4 text-right text-body tabular-nums">{fmtKES(r.term3)}</td>
                <td className="py-2.5 pl-4 text-right font-bold text-primary tabular-nums">{fmtKES(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Reports = () => {
  const { openSidebar } = useOutletContext() || {};
  const [selectedReport, setSelectedReport] = useState('fee-collection');
  const [dateRange, setDateRange] = useState('last-30-days');
  const [reportData, setReportData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Multi-year trends are independent of the dateRange filter — fetch once.
  useEffect(() => {
    api.get('/reports/trends', { params: { years: 4 } })
      .then((r) => setTrends(r.data.data))
      .catch(() => {});
  }, []);

  const formatCurrency = (amount) => {
    return `KES ${new Intl.NumberFormat('en-KE').format(amount)}`;
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/reports', { params: { dateRange } });
      setReportData(data.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const reportTypes = [
    { id: 'fee-collection', name: 'Fee Collection Report', icon: 'payments' },
    { id: 'student-balances', name: 'Student Balances', icon: 'account_balance_wallet' },
    { id: 'payment-methods', name: 'Payment Methods Analysis', icon: 'analytics' },
    { id: 'defaulters', name: 'Defaulters Report', icon: 'warning' },
    { id: 'class-performance', name: 'Class-wise Performance', icon: 'school' },
  ];

  const handlePrint = () => window.print();

  return (
    <>
      <PageHeader
        title="Reports"
        onMenuClick={openSidebar}
        actions={
          <>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="today">Today</option>
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-term">This Term</option>
              <option value="this-year">This Year</option>
            </select>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-900 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/10"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print
            </button>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Sidebar - Report Types */}
            <div className="w-72 border-r border-surface-border bg-slate-50 p-6 space-y-2 print:hidden">
              <h3 className="text-text-muted text-xs font-bold uppercase tracking-wider mb-4">Report Types</h3>
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    selectedReport === report.id
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-main hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{report.icon}</span>
                  <span className="text-sm font-semibold">{report.name}</span>
                </button>
              ))}
            </div>

            {/* Main Report Area */}
            <div className="flex-1 p-6 md:p-8 space-y-8 bg-slate-50/50 overflow-y-auto">
              {/* Multi-year analysis — always shown, independent of the period filter */}
              <MultiYearTrends trends={trends} />

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                  <p className="text-sm text-red-600">{error}</p>
                  <button onClick={fetchReport} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Retry</button>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <span className="material-symbols-outlined text-8xl text-primary">payments</span>
                      </div>
                      <div className="flex flex-col gap-2 z-10">
                        <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Revenue</p>
                        <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                          {formatCurrency(reportData?.summary.totalRevenue || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-5 z-10">
                        <span className="material-symbols-outlined text-green-500 text-lg">trending_up</span>
                        <p className="text-text-muted text-xs font-medium">This period</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                      <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                        <span className="material-symbols-outlined text-8xl text-primary">percent</span>
                      </div>
                      <div className="flex flex-col gap-2 z-10">
                        <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Collection Rate</p>
                        <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                          {reportData?.summary.collectionRate || 0}%
                        </p>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-6">
                        <div className="bg-green-500 h-2 rounded-full shadow-sm" style={{width: `${reportData?.summary.collectionRate || 0}%`}}></div>
                      </div>
                      <p className="text-text-muted text-xs mt-2 font-medium">Target: 90%</p>
                    </div>

                    <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                      <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                        <span className="material-symbols-outlined text-8xl text-primary">groups</span>
                      </div>
                      <div className="flex flex-col gap-2 z-10">
                        <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Students</p>
                        <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                          {reportData?.summary.totalStudents || 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-5 z-10">
                        <span className="material-symbols-outlined text-primary text-lg">school</span>
                        <p className="text-text-muted text-xs font-medium">Active students</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                      <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                        <span className="material-symbols-outlined text-8xl text-primary">warning</span>
                      </div>
                      <div className="flex flex-col gap-2 z-10">
                        <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Outstanding</p>
                        <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                          {formatCurrency(reportData?.summary.outstandingAmount || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-5 z-10">
                        <span className="material-symbols-outlined text-orange-500 text-lg">error</span>
                        <p className="text-text-muted text-xs font-medium">Needs collection</p>
                      </div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  {(selectedReport === 'fee-collection' || selectedReport === 'class-performance' || selectedReport === 'payment-methods') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Collection by Class */}
                      {(selectedReport === 'fee-collection' || selectedReport === 'class-performance') && (
                        <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
                          <h3 className="text-text-main text-lg font-bold font-display mb-6">Collection by Class</h3>
                          {reportData?.byClass?.length > 0 ? (
                            <div className="space-y-4">
                              {reportData.byClass.map((item, index) => (
                                <div key={index}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-text-main">{item.class}</span>
                                    <span className="text-sm font-bold text-primary">{formatCurrency(item.collected)}</span>
                                  </div>
                                  <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all" style={{width: `${item.rate}%`}}></div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-text-muted">{item.students} students</span>
                                    <span className="text-xs font-bold text-green-600">{item.rate}% collected</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-8">No data for this period</p>
                          )}
                        </div>
                      )}

                      {/* Payment Methods */}
                      {(selectedReport === 'fee-collection' || selectedReport === 'payment-methods') && (
                        <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
                          <h3 className="text-text-main text-lg font-bold font-display mb-6">Payment Methods</h3>
                          {reportData?.byPaymentMethod?.length > 0 ? (
                            <div className="space-y-4">
                              {reportData.byPaymentMethod.map((item, index) => (
                                <div key={index} className="flex items-center gap-4">
                                  <div className={`flex-shrink-0 size-12 rounded-full flex items-center justify-center ${
                                    item.method === 'M-PESA' ? 'bg-green-50' :
                                    item.method.includes('Bank') ? 'bg-blue-50' : 'bg-purple-50'
                                  }`}>
                                    <span className={`material-symbols-outlined ${
                                      item.method === 'M-PESA' ? 'text-green-600' :
                                      item.method.includes('Bank') ? 'text-blue-600' : 'text-purple-600'
                                    }`}>
                                      {item.method === 'M-PESA' ? 'phone_iphone' :
                                       item.method.includes('Bank') ? 'account_balance' : 'payments'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-semibold text-text-main">{item.method}</span>
                                      <span className="text-sm font-bold text-primary">{formatCurrency(item.amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${
                                          item.method === 'M-PESA' ? 'bg-green-500' :
                                          item.method.includes('Bank') ? 'bg-blue-500' : 'bg-purple-500'
                                        }`} style={{width: `${item.percentage}%`}}></div>
                                      </div>
                                      <span className="text-xs font-bold text-text-muted">{item.percentage}%</span>
                                    </div>
                                    <span className="text-xs text-text-muted">{item.transactions} transactions</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-8">No data for this period</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tables Section */}
                  {(selectedReport === 'fee-collection' || selectedReport === 'student-balances') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Payers */}
                      <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-surface-border bg-slate-50">
                          <h3 className="text-text-main text-lg font-bold font-display">Top Payers</h3>
                        </div>
                        <div className="p-6 space-y-4">
                          {reportData?.topPayers?.length > 0 ? (
                            reportData.topPayers.map((student, index) => (
                              <div key={index} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex-shrink-0 size-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-text-main">{student.name}</p>
                                  <p className="text-xs text-text-muted">{student.admNo} &bull; {student.class}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-600">{formatCurrency(student.paid)}</p>
                                  <p className="text-xs text-text-muted">paid</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-8">No payments in this period</p>
                          )}
                        </div>
                      </div>

                      {/* Defaulters */}
                      <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-surface-border bg-slate-50">
                          <h3 className="text-text-main text-lg font-bold font-display">Fee Defaulters</h3>
                        </div>
                        <div className="p-6 space-y-4">
                          {reportData?.defaulters?.length > 0 ? (
                            reportData.defaulters.map((student, index) => (
                              <div key={index} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex-shrink-0 size-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
                                  <span className="material-symbols-outlined text-[20px]">warning</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-text-main">{student.name}</p>
                                  <p className="text-xs text-text-muted">{student.admNo} &bull; {student.class}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-red-600">{formatCurrency(Math.abs(student.balance))}</p>
                                  <p className="text-xs text-text-muted">arrears</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-8">No defaulters found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Defaulters-only view */}
                  {selectedReport === 'defaulters' && (
                    <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-surface-border bg-slate-50 flex items-center justify-between">
                        <h3 className="text-text-main text-lg font-bold font-display">Fee Defaulters</h3>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                          {reportData?.defaulters?.length || 0} students
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs font-bold text-text-muted uppercase tracking-wider border-b border-surface-border">
                              <th className="px-6 py-3">Student</th>
                              <th className="px-6 py-3">Adm No</th>
                              <th className="px-6 py-3">Class</th>
                              <th className="px-6 py-3 text-right">Arrears</th>
                              <th className="px-6 py-3">Last Payment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportData?.defaulters?.map((s, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-text-main">{s.name}</td>
                                <td className="px-6 py-4 text-sm text-text-muted font-mono">{s.admNo}</td>
                                <td className="px-6 py-4 text-sm text-text-muted">{s.class}</td>
                                <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">{formatCurrency(Math.abs(s.balance))}</td>
                                <td className="px-6 py-4 text-sm text-text-muted">
                                  {s.lastPayment ? new Date(s.lastPayment).toLocaleDateString('en-KE') : 'Never'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(!reportData?.defaulters || reportData.defaulters.length === 0) && (
                          <p className="text-sm text-slate-400 text-center py-8">No defaulters found</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
    </>
  );
};

export default Reports;
