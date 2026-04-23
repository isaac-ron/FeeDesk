import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { useSuspensePayments, useMatchPayment, useAllocatePayment } from '../../hooks/useSuspensePayments';
import { useStudents } from '../../hooks/useStudents';

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString()}`;
const formatDate = (d) => new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });

const MatchModal = ({ payment, onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const { data: studentsResp } = useStudents(search ? { search } : {});
  const students = studentsResp?.data || [];
  const match = useMatchPayment();

  const handleSubmit = async () => {
    if (!selectedId) { setError('Select a student first'); return; }
    setError(null);
    try {
      await match.mutateAsync({ transactionId: payment._id, studentId: selectedId });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to match');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Match payment to student</h2>
            <p className="text-sm text-slate-500 mt-1">
              {formatKES(payment.amount)} from {payment.paidBy || 'Unknown'} — attempted reference: <span className="font-mono">{payment.reference || 'none'}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or admission number..."
            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
            autoFocus
          />

          <div className="mt-4 space-y-1 max-h-64 overflow-y-auto">
            {students.length === 0 && search && (
              <p className="text-sm text-slate-500 px-3 py-4">No students match "{search}"</p>
            )}
            {students.slice(0, 20).map((s) => (
              <button
                key={s._id}
                onClick={() => setSelectedId(s._id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  selectedId === s._id
                    ? 'bg-primary/5 border-primary text-primary'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.admissionNumber} • {s.classLevel || 'No class'}</p>
                  </div>
                  <span className={`text-xs font-bold ${s.currentBalance < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {s.currentBalance < 0 ? `${formatKES(Math.abs(s.currentBalance))} owed` : 'Paid up'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedId || match.isPending}
            className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover disabled:opacity-50"
          >
            {match.isPending ? 'Matching...' : 'Match & Allocate'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Suspense = () => {
  const { openSidebar } = useOutletContext() || {};
  const { data: payments = [], isLoading, error } = useSuspensePayments();
  const allocate = useAllocatePayment();
  const [matchTarget, setMatchTarget] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const counts = useMemo(() => ({
    unmatched: payments.filter((p) => p.suspenseType === 'UNMATCHED').length,
    unallocated: payments.filter((p) => p.suspenseType === 'UNALLOCATED').length,
    total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
  }), [payments]);

  const handleAllocate = async (p) => {
    setActionError(null);
    setBusyId(p._id);
    try {
      await allocate.mutateAsync({ transactionId: p._id });
    } catch (e) {
      setActionError(e.response?.data?.message || 'Failed to allocate');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Suspense payments" onMenuClick={openSidebar} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-slate-500 mb-6">
            Payments that could not be automatically applied to a student or fee line. Match them to the correct student or allocate to outstanding fees.
          </p>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unmatched</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{counts.unmatched}</p>
              <p className="text-xs text-slate-500 mt-1">no student identified</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unallocated</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{counts.unallocated}</p>
              <p className="text-xs text-slate-500 mt-1">student set, no fees at the time</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total in suspense</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatKES(counts.total)}</p>
            </div>
          </div>

          {actionError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{actionError}</div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">Failed to load suspense payments</div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">task_alt</span>
                <p className="text-sm font-semibold">No suspense payments</p>
                <p className="text-xs text-slate-400 mt-1">Every payment has been matched and allocated.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Paid by</th>
                    <th className="px-4 py-3">Attempted ref</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {p.source || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.paidBy || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{p.reference || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {p.suspenseType === 'UNMATCHED' ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <span className="material-symbols-outlined text-[16px]">help</span>
                            Unmatched
                          </span>
                        ) : (
                          <span className="text-slate-700">
                            {p.student?.name} <span className="text-slate-400">({p.student?.admissionNumber})</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">{formatKES(p.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.suspenseType === 'UNMATCHED' ? (
                          <button
                            onClick={() => setMatchTarget(p)}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover"
                          >
                            Match to student
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAllocate(p)}
                            disabled={busyId === p._id}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                          >
                            {busyId === p._id ? 'Allocating...' : 'Allocate to fees'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {matchTarget && (
        <MatchModal payment={matchTarget} onClose={() => setMatchTarget(null)} />
      )}
    </>
  );
};

export default Suspense;
