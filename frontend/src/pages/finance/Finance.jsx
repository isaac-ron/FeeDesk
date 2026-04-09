import { useState, useEffect, useContext } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { SocketContext } from '../../context/SocketContext';

const Finance = () => {
  const { socket } = useContext(SocketContext);
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [dateRange, setDateRange] = useState('today');
  const [liveUpdate, setLiveUpdate] = useState(null);

  // Mock data
  const mockTransactions = [
    { id: 1, transactionId: 'MPESA12345', student: 'John Kamau', admNo: 'ADM-001', amount: 5000, source: 'MPESA', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-19T10:30:00', paidBy: '254712345678' },
    { id: 2, transactionId: 'EQU67890', student: 'Mary Wanjiru', admNo: 'ADM-002', amount: 8000, source: 'EQUITY BANK', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-19T09:15:00', paidBy: 'Jane Wanjiru' },
    { id: 3, transactionId: 'CASH001', student: 'David Ochieng', admNo: 'ADM-003', amount: 3000, source: 'CASH', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-19T08:00:00', paidBy: 'Cash Payment' },
    { id: 4, transactionId: 'KCB54321', student: 'Grace Akinyi', admNo: 'ADM-004', amount: 6000, source: 'KCB BANK', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-18T16:45:00', paidBy: 'Susan Akinyi' },
    { id: 5, transactionId: 'MPESA98765', student: 'Brian Kiprop', admNo: 'ADM-005', amount: 4500, source: 'MPESA', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-18T14:20:00', paidBy: '254756789012' },
    { id: 6, transactionId: 'COOP11223', student: 'Faith Njeri', admNo: 'ADM-006', amount: 7000, source: 'COOP BANK', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-18T11:30:00', paidBy: 'Lucy Njeri' },
    { id: 7, transactionId: 'SUSPENSE01', student: 'Unknown', admNo: 'UNKNOWN-REF', amount: 2000, source: 'MPESA', type: 'CREDIT', status: 'PENDING', date: '2026-01-18T10:00:00', paidBy: '254700000000' },
    { id: 8, transactionId: 'MPESA11111', student: 'Mercy Adhiambo', admNo: 'ADM-008', amount: 5500, source: 'MPESA', type: 'CREDIT', status: 'COMPLETED', date: '2026-01-17T15:10:00', paidBy: '254789012345' },
  ];

  useEffect(() => {
    setTransactions(mockTransactions);
  }, []);

  // Real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('payment_received', (paymentData) => {
        setLiveUpdate({
          type: 'success',
          message: `New payment of KES ${paymentData.amount.toLocaleString()} from ${paymentData.studentName}`,
        });
        
        setTimeout(() => setLiveUpdate(null), 5000);
      });

      return () => {
        socket.off('payment_received');
      };
    }
  }, [socket]);

  const stats = {
    todayCollection: transactions.filter(t => t.date.startsWith('2026-01-19')).reduce((sum, t) => sum + t.amount, 0),
    totalTransactions: transactions.length,
    mpesaPayments: transactions.filter(t => t.source === 'MPESA').reduce((sum, t) => sum + t.amount, 0),
    bankPayments: transactions.filter(t => t.source.includes('BANK')).reduce((sum, t) => sum + t.amount, 0),
    cashPayments: transactions.filter(t => t.source === 'CASH').reduce((sum, t) => sum + t.amount, 0),
    pendingTransactions: transactions.filter(t => t.status === 'PENDING').length,
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesType = filterType === 'All' || txn.type === filterType;
    const matchesSource = filterSource === 'All' || txn.source === filterSource;
    return matchesType && matchesSource;
  });

  const formatCurrency = (amount) => {
    return `KES ${new Intl.NumberFormat('en-KE').format(amount)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSourceIcon = (source) => {
    if (source === 'MPESA') return 'phone_iphone';
    if (source.includes('BANK')) return 'account_balance';
    if (source === 'CASH') return 'payments';
    return 'payment';
  };

  const getSourceColor = (source) => {
    if (source === 'MPESA') return 'text-green-600 bg-green-50';
    if (source.includes('BANK')) return 'text-blue-600 bg-blue-50';
    if (source === 'CASH') return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

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
            <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Finance</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center w-72 h-11 bg-slate-50 border border-surface-border rounded-full overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <div className="pl-4 pr-2 text-text-muted flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input 
                className="w-full bg-transparent border-none text-text-main text-sm placeholder:text-text-muted focus:ring-0 focus:outline-none h-full"
                placeholder="Search transaction..."
              />
            </div>
            <button className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-900/10">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Record Payment</span>
            </button>
            <button className="size-11 flex items-center justify-center rounded-full bg-white border border-surface-border text-text-muted hover:text-primary hover:bg-slate-50 transition-all relative shadow-sm">
              <span className="material-symbols-outlined text-[22px]">filter_alt</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
          {/* Live Update Notification */}
          {liveUpdate && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 flex items-center gap-3 animate-slide-in shadow-lg">
              <div className="flex items-center justify-center size-10 rounded-full bg-white shadow-sm">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-green-800">LIVE UPDATE</p>
                <p className="text-sm font-medium text-green-800">{liveUpdate.message}</p>
              </div>
              <span className="text-xs font-mono opacity-50 text-green-800">just now</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Today's Collection */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <span className="material-symbols-outlined text-8xl text-primary">payments</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Today's Collection</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {formatCurrency(stats.todayCollection)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-green-500 text-lg">trending_up</span>
                <p className="text-text-muted text-xs font-medium">{transactions.filter(t => t.date.startsWith('2026-01-19')).length} transactions</p>
              </div>
            </div>

            {/* M-PESA Payments */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">phone_iphone</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">M-PESA</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {formatCurrency(stats.mpesaPayments)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <div className="bg-green-500/10 rounded-full px-2 py-0.5">
                  <p className="text-xs font-bold text-green-600">
                    {Math.round((stats.mpesaPayments / (stats.mpesaPayments + stats.bankPayments + stats.cashPayments)) * 100)}%
                  </p>
                </div>
                <p className="text-text-muted text-xs font-medium">of total</p>
              </div>
            </div>

            {/* Bank Payments */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">account_balance</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Bank Transfers</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {formatCurrency(stats.bankPayments)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <div className="bg-blue-500/10 rounded-full px-2 py-0.5">
                  <p className="text-xs font-bold text-blue-600">
                    {Math.round((stats.bankPayments / (stats.mpesaPayments + stats.bankPayments + stats.cashPayments)) * 100)}%
                  </p>
                </div>
                <p className="text-text-muted text-xs font-medium">of total</p>
              </div>
            </div>

            {/* Pending Transactions */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">pending</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Pending/Suspense</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {stats.pendingTransactions}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-orange-500 text-lg">warning</span>
                <p className="text-text-muted text-xs font-medium">Needs allocation</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">Type:</label>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="All">All Types</option>
                <option value="CREDIT">Credit (Payment In)</option>
                <option value="DEBIT">Debit (Reversal)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">Source:</label>
              <select 
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="All">All Sources</option>
                <option value="MPESA">M-PESA</option>
                <option value="EQUITY BANK">Equity Bank</option>
                <option value="KCB BANK">KCB Bank</option>
                <option value="COOP BANK">Co-op Bank</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-900 text-white text-sm font-medium rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border bg-slate-50">
              <h3 className="text-text-main text-lg font-bold font-display">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-surface-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Paid By</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-primary font-mono">{txn.transactionId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-text-main">{txn.student}</span>
                          <span className="text-xs text-text-muted">{txn.admNo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-green-600">{formatCurrency(txn.amount)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 w-fit px-3 py-1 rounded-full ${getSourceColor(txn.source)}`}>
                          <span className="material-symbols-outlined text-[16px]">{getSourceIcon(txn.source)}</span>
                          <span className="text-xs font-bold">{txn.source}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{txn.paidBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatDate(txn.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          txn.status === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-text-muted hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;