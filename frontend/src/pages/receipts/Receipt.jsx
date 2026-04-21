import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const SOURCE_LABELS = {
  MPESA: 'M-PESA',
  BANK_TRANSFER: 'Bank Transfer',
  BANK_AGENT: 'Bank Agent',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
};

const formatCurrency = (amount) =>
  `KES ${new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;

const formatDate = (d) =>
  new Date(d).toLocaleString('en-KE', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const useTransaction = (id) =>
  useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api.get(`/transactions/${id}`).then(r => r.data),
    enabled: !!id,
  });

const useMySchool = () =>
  useQuery({
    queryKey: ['school', 'me'],
    queryFn: () => api.get('/schools/me').then(r => r.data),
    staleTime: 5 * 60_000,
  });

const Receipt = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { data: txnRes, isLoading: txnLoading, error: txnError } = useTransaction(transactionId);
  const { data: schoolRes, isLoading: schoolLoading } = useMySchool();

  const txn = txnRes?.data;
  const school = schoolRes?.data;

  // Auto-trigger print if ?print=1 is in the URL — lets the caller open
  // the receipt in a new tab and have the browser's print dialog pop up
  // without an extra click.
  useEffect(() => {
    if (!txn || !school) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === '1') {
      const t = setTimeout(() => window.print(), 250);
      return () => clearTimeout(t);
    }
  }, [txn, school]);

  if (txnLoading || schoolLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3 text-text-muted">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading receipt...</span>
      </div>
    );
  }

  if (txnError || !txn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <span className="material-symbols-outlined text-4xl text-red-400">error</span>
        <p className="text-sm text-red-600 font-medium">
          {txnError?.response?.data?.message || 'Receipt not found.'}
        </p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary underline">Go back</button>
      </div>
    );
  }

  const student = txn.student;
  const allocations = Array.isArray(txn.allocations) ? txn.allocations : [];
  const allocatedTotal = allocations.reduce((s, a) => s + (a.amount || 0), 0);
  const overpaid = Math.max(0, (txn.amount || 0) - allocatedTotal);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100">
      {/* Action bar — hidden on print */}
      <div className="print-hide sticky top-0 z-10 bg-white border-b border-surface-border px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 h-10 px-5 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Receipt body */}
      <div className="max-w-2xl mx-auto my-8 p-10 bg-white rounded-2xl border border-surface-border shadow-sm print-area">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-text-main font-display leading-tight">
              {school?.name || 'School'}
            </h1>
            {school?.address && (
              <p className="text-xs text-text-muted mt-1">
                {[school.address.street, school.address.city, school.address.county].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-text-muted">
              {school?.contactPhone && <span>Tel: {school.contactPhone}</span>}
              {school?.contactEmail && <span>{school.contactEmail}</span>}
            </div>
            {school?.paybillNumber && (
              <p className="text-xs text-text-muted mt-1">Paybill: {school.paybillNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Receipt</p>
            <p className="text-base font-mono font-bold text-primary mt-1">{txn.transactionId}</p>
          </div>
        </div>

        <h2 className="text-center text-sm font-bold text-text-muted uppercase tracking-[0.2em] mt-6">
          Payment Receipt
        </h2>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Date</p>
            <p className="text-text-main font-medium mt-0.5">{formatDate(txn.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Method</p>
            <p className="text-text-main font-medium mt-0.5">{SOURCE_LABELS[txn.source] || txn.source}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Student</p>
            <p className="text-text-main font-medium mt-0.5">
              {student ? `${student.name} (${student.admissionNumber})` : 'Unallocated / Suspense'}
            </p>
            {student?.classLevel && (
              <p className="text-xs text-text-muted">{student.classLevel}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Paid By</p>
            <p className="text-text-main font-medium mt-0.5">{txn.paidBy || '—'}</p>
            {txn.phoneNumber && <p className="text-xs text-text-muted">{txn.phoneNumber}</p>}
          </div>
        </div>

        {/* Amount */}
        <div className="mt-6 p-5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-text-muted">Amount paid</p>
            <p className="text-3xl font-extrabold text-text-main font-display">{formatCurrency(txn.amount)}</p>
          </div>
        </div>

        {/* Allocations */}
        {allocations.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Applied to</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200">
                {allocations.map((a, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-text-main">{a.studentFee?.name || 'Fee'}</td>
                    <td className="py-2 text-right font-semibold text-text-main">{formatCurrency(a.amount)}</td>
                  </tr>
                ))}
                {overpaid > 0 && (
                  <tr>
                    <td className="py-2 text-text-muted italic">Credit on account</td>
                    <td className="py-2 text-right font-semibold text-emerald-600">{formatCurrency(overpaid)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Status + footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              txn.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              txn.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
              txn.status === 'REVERSED' ? 'bg-red-100 text-red-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {txn.status}
            </span>
          </div>
          <p className="text-xs text-text-muted">Thank you for your payment.</p>
        </div>

        <p className="text-[10px] text-text-muted/70 text-center mt-6">
          This is a computer-generated receipt. Printed {formatDate(new Date())}.
        </p>
      </div>
    </div>
  );
};

export default Receipt;
