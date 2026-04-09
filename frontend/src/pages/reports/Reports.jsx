import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('fee-collection');
  const [dateRange, setDateRange] = useState('last-30-days');
  const [reportData, setReportData] = useState(null);

  // Mock report data
  const mockReportData = {
    summary: {
      totalRevenue: 487500,
      totalStudents: 8,
      collectionRate: 85,
      outstandingAmount: 40500,
    },
    byClass: [
      { class: 'Form 4', students: 3, collected: 157500, outstanding: 27500, rate: 85 },
      { class: 'Form 3', students: 2, collected: 150000, outstanding: 8000, rate: 95 },
      { class: 'Form 2', students: 2, collected: 110000, outstanding: 5000, rate: 96 },
      { class: 'Form 1', students: 1, collected: 70000, outstanding: 0, rate: 100 },
    ],
    byPaymentMethod: [
      { method: 'M-PESA', amount: 247500, percentage: 51, transactions: 45 },
      { method: 'Bank Transfer', amount: 190000, percentage: 39, transactions: 28 },
      { method: 'Cash', amount: 50000, percentage: 10, transactions: 12 },
    ],
    topPayers: [
      { name: 'Mary Wanjiru', admNo: 'ADM-002', class: 'Form 3', paid: 65000, balance: 0 },
      { name: 'David Ochieng', admNo: 'ADM-003', class: 'Form 4', paid: 48000, balance: -5000 },
      { name: 'Grace Akinyi', admNo: 'ADM-004', class: 'Form 2', paid: 45000, balance: 2000 },
      { name: 'Brian Kiprop', admNo: 'ADM-005', class: 'Form 3', paid: 42000, balance: -8000 },
    ],
    defaulters: [
      { name: 'Kevin Mutua', admNo: 'ADM-007', class: 'Form 4', paid: 35000, balance: -15000, lastPayment: '2026-01-10' },
      { name: 'John Kamau', admNo: 'ADM-001', class: 'Form 4', paid: 37500, balance: -12500, lastPayment: '2026-01-15' },
      { name: 'Brian Kiprop', admNo: 'ADM-005', class: 'Form 3', paid: 42000, balance: -8000, lastPayment: '2026-01-17' },
    ],
  };

  useEffect(() => {
    setReportData(mockReportData);
  }, [selectedReport, dateRange]);

  const formatCurrency = (amount) => {
    return `KES ${new Intl.NumberFormat('en-KE').format(amount)}`;
  };

  const reportTypes = [
    { id: 'fee-collection', name: 'Fee Collection Report', icon: 'payments' },
    { id: 'student-balances', name: 'Student Balances', icon: 'account_balance_wallet' },
    { id: 'payment-methods', name: 'Payment Methods Analysis', icon: 'analytics' },
    { id: 'defaulters', name: 'Defaulters Report', icon: 'warning' },
    { id: 'class-performance', name: 'Class-wise Performance', icon: 'school' },
    { id: 'sms-report', name: 'SMS Report', icon: 'sms' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-surface-border bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <button className="lg:hidden text-text-main">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Reports & Analytics</h2>
          </div>
          <div className="flex items-center gap-4">
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
            <button className="flex items-center gap-2 px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-900 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/10">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Sidebar - Report Types */}
            <div className="w-72 border-r border-surface-border bg-slate-50 p-6 space-y-2">
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
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Revenue */}
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

                {/* Collection Rate */}
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
                    <div 
                      className="bg-green-500 h-2 rounded-full shadow-sm" 
                      style={{width: `${reportData?.summary.collectionRate || 0}%`}}
                    ></div>
                  </div>
                  <p className="text-text-muted text-xs mt-2 font-medium">Target: 90%</p>
                </div>

                {/* Total Students */}
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

                {/* Outstanding Amount */}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collection by Class */}
                <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
                  <h3 className="text-text-main text-lg font-bold font-display mb-6">Collection by Class</h3>
                  <div className="space-y-4">
                    {reportData?.byClass.map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-text-main">{item.class}</span>
                          <span className="text-sm font-bold text-primary">{formatCurrency(item.collected)}</span>
                        </div>
                        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                            style={{width: `${item.rate}%`}}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-text-muted">{item.students} students</span>
                          <span className="text-xs font-bold text-green-600">{item.rate}% collected</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
                  <h3 className="text-text-main text-lg font-bold font-display mb-6">Payment Methods</h3>
                  <div className="space-y-4">
                    {reportData?.byPaymentMethod.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className={`flex-shrink-0 size-12 rounded-full flex items-center justify-center ${
                          item.method === 'M-PESA' ? 'bg-green-50' :
                          item.method === 'Bank Transfer' ? 'bg-blue-50' : 'bg-purple-50'
                        }`}>
                          <span className={`material-symbols-outlined ${
                            item.method === 'M-PESA' ? 'text-green-600' :
                            item.method === 'Bank Transfer' ? 'text-blue-600' : 'text-purple-600'
                          }`}>
                            {item.method === 'M-PESA' ? 'phone_iphone' :
                             item.method === 'Bank Transfer' ? 'account_balance' : 'payments'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-text-main">{item.method}</span>
                            <span className="text-sm font-bold text-primary">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  item.method === 'M-PESA' ? 'bg-green-500' :
                                  item.method === 'Bank Transfer' ? 'bg-blue-500' : 'bg-purple-500'
                                }`}
                                style={{width: `${item.percentage}%`}}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-text-muted">{item.percentage}%</span>
                          </div>
                          <span className="text-xs text-text-muted">{item.transactions} transactions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tables Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Payers */}
                <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-surface-border bg-slate-50">
                    <h3 className="text-text-main text-lg font-bold font-display">Top Payers</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {reportData?.topPayers.map((student, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 size-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-text-main">{student.name}</p>
                          <p className="text-xs text-text-muted">{student.admNo} • {student.class}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{formatCurrency(student.paid)}</p>
                          <p className="text-xs text-text-muted">paid</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defaulters */}
                <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-surface-border bg-slate-50">
                    <h3 className="text-text-main text-lg font-bold font-display">Fee Defaulters</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {reportData?.defaulters.map((student, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 size-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[20px]">warning</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-text-main">{student.name}</p>
                          <p className="text-xs text-text-muted">{student.admNo} • {student.class}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">{formatCurrency(Math.abs(student.balance))}</p>
                          <p className="text-xs text-text-muted">arrears</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;