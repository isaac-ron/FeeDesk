import { useState, useEffect, useContext, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { SocketContext } from '../../context/SocketContext';
import transactionService from '../../services/transactionService';
import studentService from '../../services/studentService';

const SOURCE_ICONS = {
  MPESA: { icon: 'phone_iphone', color: 'text-green-600 bg-green-50' },
  BANK_TRANSFER: { icon: 'account_balance', color: 'text-blue-600 bg-blue-50' },
  BANK_AGENT: { icon: 'account_balance', color: 'text-blue-600 bg-blue-50' },
  CASH: { icon: 'payments', color: 'text-purple-600 bg-purple-50' },
  CHEQUE: { icon: 'receipt', color: 'text-orange-600 bg-orange-50' },
};

const EMPTY_PAYMENT_FORM = {
  admissionNumber: '',
  amount: '',
  receiptNumber: '',
  paidBy: '',
  source: 'CASH',
};

const Finance = () => {
  const { socket } = useContext(SocketContext);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [liveUpdate, setLiveUpdate] = useState(null);

  // Record Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [studentLookup, setStudentLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterType !== 'All') params.type = filterType;
      if (filterSource !== 'All') params.source = filterSource;
      const data = await transactionService.getTransactions(params);
      setTransactions(data.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSource]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time payment updates
  useEffect(() => {
    if (!socket) return;
    const handlePayment = (paymentData) => {
      setLiveUpdate({
        type: 'success',
        message: `New payment of KES ${paymentData.amount?.toLocaleString()} from ${paymentData.studentName}`,
      });
      setTimeout(() => setLiveUpdate(null), 5000);
      fetchTransactions();
    };
    socket.on('payment_received', handlePayment);
    return () => socket.off('payment_received', handlePayment);
  }, [socket, fetchTransactions]);

  // Student lookup by admission number (debounced)
  useEffect(() => {
    if (!paymentForm.admissionNumber.trim()) {
      setStudentLookup(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const data = await studentService.getStudentByAdmission(paymentForm.admissionNumber.trim());
        setStudentLookup(data.data);
      } catch {
        setStudentLookup(null);
      } finally {
        setLookupLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [paymentForm.admissionNumber]);

  const stats = {
    todayTotal: transactions
      .filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString())
      .reduce((s, t) => s + t.amount, 0),
    mpesaTotal: transactions.filter(t => t.source === 'MPESA').reduce((s, t) => s + t.amount, 0),
    bankTotal: transactions.filter(t => ['BANK_TRANSFER', 'BANK_AGENT'].includes(t.source)).reduce((s, t) => s + t.amount, 0),
    pendingCount: transactions.filter(t => t.status === 'PENDING').length,
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesType = filterType === 'All' || txn.type === filterType;
    const matchesSource = filterSource === 'All' || txn.source === filterSource;
    return matchesType && matchesSource;
  });

  const formatCurrency = (amount) => `KES ${new Intl.NumberFormat('en-KE').format(amount)}`;

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getSourceStyle = (source) => SOURCE_ICONS[source] || { icon: 'payment', color: 'text-gray-600 bg-gray-50' };

  const handlePaymentFormChange = (e) => {
    setPaymentForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentLoading(true);
    try {
      const payload = {
        amount: parseFloat(paymentForm.amount),
        reference: paymentForm.admissionNumber.trim(),
        receiptNumber: paymentForm.receiptNumber || undefined,
        paidBy: paymentForm.paidBy || paymentForm.admissionNumber.trim(),
      };

      if (paymentForm.source === 'CASH') {
        await transactionService.recordCashPayment(payload);
      } else {
        await transactionService.recordBankPayment({
          ...payload,
          transactionId: paymentForm.receiptNumber || `MAN-${Date.now()}`,
          source: paymentForm.source,
        });
      }
      setShowPaymentModal(false);
      setPaymentForm(EMPTY_PAYMENT_FORM);
      setStudentLookup(null);
      fetchTransactions();
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentForm(EMPTY_PAYMENT_FORM);
    setPaymentError(null);
    setStudentLookup(null);
    setShowPaymentModal(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white">
        {/* Live update notification */}
        {liveUpdate && (
          <div className={`absolute top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium slide-in ${
            liveUpdate.type === 'success' ? 'bg-green-500' : 'bg-orange-500'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {liveUpdate.type === 'success' ? 'check_circle' : 'warning'}
            </span>
            {liveUpdate.message}
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-surface-border bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <button className="lg:hidden text-text-main">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Finance</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openPaymentModal}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-900/10"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Record Payment</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">payments</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Today&apos;s Collection</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{formatCurrency(stats.todayTotal)}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-green-500 text-lg">trending_up</span>
                <p className="text-text-muted text-xs font-medium">Today</p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-green-500">phone_iphone</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">M-PESA</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{formatCurrency(stats.mpesaTotal)}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                <p className="text-text-muted text-xs font-medium">All time</p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-blue-500">account_balance</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Bank Transfers</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{formatCurrency(stats.bankTotal)}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-blue-500 text-lg">check_circle</span>
                <p className="text-text-muted text-xs font-medium">All time</p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-orange-500">pending</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Pending / Suspense</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{stats.pendingCount}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-orange-500 text-lg">warning</span>
                <p className="text-text-muted text-xs font-medium">Needs review</p>
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
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
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
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="BANK_AGENT">Bank Agent</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-text-muted gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading transactions...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                <p className="text-sm text-red-500 font-medium">{error}</p>
                <button onClick={fetchTransactions} className="text-sm text-primary underline">Retry</button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                <p className="text-sm text-text-muted font-medium">No transactions found</p>
              </div>
            ) : (
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredTransactions.map((txn) => {
                      const src = getSourceStyle(txn.source);
                      return (
                        <tr key={txn._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-primary font-mono">{txn.transactionId}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {txn.student ? (
                              <div>
                                <p className="text-sm font-semibold text-text-main">{txn.student.name}</p>
                                <p className="text-xs text-text-muted">{txn.student.admissionNumber}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-text-muted italic">Unknown / Suspense</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-bold ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${src.color}`}>
                              <span className="material-symbols-outlined text-[14px]">{src.icon}</span>
                              {txn.source.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{txn.paidBy || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatDate(txn.createdAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              txn.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              txn.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                              txn.status === 'REVERSED' ? 'bg-red-100 text-red-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <h3 className="text-lg font-bold text-text-main font-display">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-text-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {paymentError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {paymentError}
                </div>
              )}

              {/* Admission Number with live lookup */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                  Admission Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    name="admissionNumber"
                    value={paymentForm.admissionNumber}
                    onChange={handlePaymentFormChange}
                    placeholder="e.g. ADM-001"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                  {lookupLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {studentLookup && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-medium">
                    <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                    {studentLookup.name} — {studentLookup.classLevel} — Balance: {studentLookup.currentBalance <= 0 ? `KES ${Math.abs(studentLookup.currentBalance).toLocaleString()} owed` : 'Paid up'}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                  Amount (KES) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  name="amount"
                  value={paymentForm.amount}
                  onChange={handlePaymentFormChange}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Payment Method</label>
                <select
                  name="source"
                  value={paymentForm.source}
                  onChange={handlePaymentFormChange}
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="BANK_AGENT">Bank Agent</option>
                </select>
              </div>

              {/* Receipt / Reference number */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                  Receipt / Reference No.
                </label>
                <input
                  name="receiptNumber"
                  value={paymentForm.receiptNumber}
                  onChange={handlePaymentFormChange}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Paid By</label>
                <input
                  name="paidBy"
                  value={paymentForm.paidBy}
                  onChange={handlePaymentFormChange}
                  placeholder="Parent / guardian name"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium text-text-main hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">add_card</span>
                  )}
                  {paymentLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
