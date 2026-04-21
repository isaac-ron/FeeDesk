import { useState, useMemo, useContext } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { TermContext } from '../../context/TermContext';
import { useStudentLedger } from '../../hooks/useStudentLedger';

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-KE') : '—';

const statusPill = (status) => {
  const map = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    UNPAID: 'bg-red-100 text-red-700',
    WAIVED: 'bg-slate-100 text-slate-600',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
};

const StudentLedger = () => {
  const { studentId } = useParams();
  const { openSidebar } = useOutletContext() || {};
  const { terms } = useContext(TermContext);
  const [termFilter, setTermFilter] = useState('');

  const realTerms = (terms || []).filter(t => t._id !== 'fallback');

  const queryParams = useMemo(() => {
    const p = {};
    if (termFilter) p.term = termFilter;
    return p;
  }, [termFilter]);

  const { data: ledgerResponse, isLoading: loading, error: queryError } = useStudentLedger(studentId, queryParams);
  const ledger = ledgerResponse?.data || null;
  const error = queryError?.response?.data?.message || (queryError ? 'Failed to load ledger.' : null);

  const student = ledger?.student;
  const fees = ledger?.fees || [];
  const totals = ledger?.totals || { charged: 0, paid: 0, outstanding: 0 };
  const payments = ledger?.payments || [];

  return (
    <>
      <PageHeader
        title={student?.name || 'Student ledger'}
        subtitle={
          <>
            <Link to="/students" className="hover:text-primary">Students</Link>
            <span className="mx-1">›</span>
            <span>{student?.admissionNumber || studentId}</span>
          </>
        }
        onMenuClick={openSidebar}
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {loading && <div className="text-text-muted text-sm">Loading ledger…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

        {student && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-surface-border rounded-2xl p-5">
                <p className="text-xs font-bold text-text-muted uppercase">Student</p>
                <p className="text-lg font-extrabold text-text-main mt-1">{student.name}</p>
                <p className="text-sm text-text-muted">{student.admissionNumber} · {student.classLevel}</p>
              </div>
              <div className="bg-white border border-surface-border rounded-2xl p-5">
                <p className="text-xs font-bold text-text-muted uppercase">Total charged</p>
                <p className="text-2xl font-extrabold text-text-main mt-1 font-display">{formatKES(totals.charged)}</p>
              </div>
              <div className="bg-white border border-surface-border rounded-2xl p-5">
                <p className="text-xs font-bold text-text-muted uppercase">Total paid</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-display">{formatKES(totals.paid)}</p>
              </div>
              <div className="bg-white border border-surface-border rounded-2xl p-5">
                <p className="text-xs font-bold text-text-muted uppercase">Outstanding</p>
                <p className={`text-2xl font-extrabold mt-1 font-display ${totals.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatKES(totals.outstanding)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-text-muted">Term:</label>
              <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="px-4 py-2 border border-surface-border rounded-lg text-sm bg-white">
                <option value="">All terms</option>
                {realTerms.map(t => <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>)}
              </select>
            </div>

            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-border">
                <h2 className="text-base font-bold text-text-main font-display">Fee ledger</h2>
              </div>
              {fees.length === 0 ? (
                <div className="p-12 text-center text-text-muted text-sm">No charges yet for this student.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-surface-border">
                    <tr className="text-left text-xs font-bold text-text-muted uppercase">
                      <th className="px-6 py-3">Item</th>
                      <th className="px-6 py-3">Term</th>
                      <th className="px-6 py-3">Due</th>
                      <th className="px-6 py-3 text-right">Charged</th>
                      <th className="px-6 py-3 text-right">Paid</th>
                      <th className="px-6 py-3 text-right">Outstanding</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map(f => {
                      const outstanding = Math.max(0, (f.amountCharged || 0) - (f.amountPaid || 0));
                      return (
                        <tr key={f._id} className="border-b border-surface-border last:border-0">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-text-main text-sm">{f.name}</p>
                            <p className="text-xs text-text-muted">{f.type}</p>
                          </td>
                          <td className="px-6 py-3 text-sm text-text-muted">{f.term?.name || '—'}</td>
                          <td className="px-6 py-3 text-sm text-text-muted">{formatDate(f.dueDate)}</td>
                          <td className="px-6 py-3 text-right text-sm font-semibold">{formatKES(f.amountCharged)}</td>
                          <td className="px-6 py-3 text-right text-sm text-emerald-600 font-semibold">{formatKES(f.amountPaid)}</td>
                          <td className="px-6 py-3 text-right text-sm font-bold text-text-main">{formatKES(outstanding)}</td>
                          <td className="px-6 py-3">{statusPill(f.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-border">
                <h2 className="text-base font-bold text-text-main font-display">Recent payments</h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No payments on record.</div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {payments.map(p => (
                    <div key={p._id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-main">{formatKES(p.amount)}</p>
                        <p className="text-xs text-text-muted">
                          {p.mpesaReceiptNumber || p._id.slice(-6)} · {formatDate(p.paidAt || p.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted">{(p.allocations || []).length} allocation{(p.allocations || []).length === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default StudentLedger;
