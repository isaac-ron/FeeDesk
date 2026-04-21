import { useState, useEffect, useMemo, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { TermContext } from '../../context/TermContext';
import {
  useFeeStructures,
  useCreateFeeStructure,
  useUpdateFeeStructure,
  usePublishFeeStructure,
  useDeleteFeeStructure,
} from '../../hooks/useFees';

const CLASS_LEVELS = ['ALL', 'Grade 10', 'Grade 11', 'Grade 12'];

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

const Fees = () => {
  const { openSidebar } = useOutletContext() || {};
  const { terms, activeTerm } = useContext(TermContext);

  const [filterTerm, setFilterTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ term: '', classLevel: 'ALL', amount: '', label: 'Term fees' });
  const [formError, setFormError] = useState(null);

  const realTerms = (terms || []).filter((t) => t._id !== 'fallback');

  useEffect(() => {
    if (!filterTerm && activeTerm?._id && activeTerm._id !== 'fallback') {
      setFilterTerm(activeTerm._id);
    }
  }, [activeTerm, filterTerm]);

  const queryParams = useMemo(() => {
    const p = {};
    if (filterTerm) p.term = filterTerm;
    return p;
  }, [filterTerm]);

  const { data: structureData, isLoading: loading, error: queryError } = useFeeStructures(queryParams);
  const structures = structureData?.data || [];
  const error = queryError?.response?.data?.message || (queryError ? 'Failed to load fee structures.' : null);

  const createMutation = useCreateFeeStructure();
  const updateMutation = useUpdateFeeStructure();
  const publishMutation = usePublishFeeStructure();
  const deleteMutation = useDeleteFeeStructure();
  const saving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm({
      term: filterTerm || activeTerm?._id || realTerms[0]?._id || '',
      classLevel: 'Grade 10',
      amount: '',
      label: 'Term fees',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      term: s.term?._id || s.term,
      classLevel: s.classLevel,
      amount: s.amount,
      label: s.label || 'Term fees',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (!form.term) throw new Error('Select a term.');
      const numericAmount = Number(form.amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        throw new Error('Enter a valid amount.');
      }
      const payload = {
        term: form.term,
        classLevel: form.classLevel,
        amount: numericAmount,
        label: form.label || 'Term fees',
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save.');
    }
  };

  const handlePublish = async (s) => {
    if (!window.confirm(`Publish ${s.classLevel} fees? Every active student in this class will be invoiced for ${formatKES(s.amount)}.`)) return;
    try {
      await publishMutation.mutateAsync(s._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Publish failed');
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm('Delete this DRAFT structure?')) return;
    try {
      await deleteMutation.mutateAsync(s._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const statusBadge = (status) => {
    const map = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PUBLISHED: 'bg-emerald-100 text-emerald-700',
      ARCHIVED: 'bg-amber-100 text-amber-700',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
  };

  return (
    <>
      <PageHeader
        title="Fee structures"
        subtitle="Set the term fee for each class, then publish to invoice students"
        onMenuClick={openSidebar}
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 h-11 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-full shadow-lg shadow-primary/10"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New structure
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-text-muted">Term:</label>
            <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="px-4 py-2 border border-surface-border rounded-lg text-sm bg-white">
              <option value="">All terms</option>
              {realTerms.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>)}
            </select>
          </div>
        </div>

        {loading && <div className="text-text-muted text-sm">Loading structures…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

        {!loading && !error && structures.length === 0 && (
          <div className="bg-white border border-surface-border rounded-2xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
            <p className="text-text-muted mt-2 mb-4">No fee structures yet for this term.</p>
            <button onClick={openCreate} className="text-primary font-semibold text-sm underline">Create your first structure</button>
          </div>
        )}

        {!loading && !error && structures.length > 0 && (
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-surface-border">
                <tr className="text-left text-xs font-bold text-text-muted uppercase">
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Term</th>
                  <th className="px-6 py-3">Label</th>
                  <th className="px-6 py-3 text-right">Amount / student</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Invoiced</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => (
                  <tr key={s._id} className="border-b border-surface-border last:border-0">
                    <td className="px-6 py-3 text-sm font-semibold text-text-main">{s.classLevel}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">
                      {s.term?.name || '—'} <span className="text-text-muted/70">· {s.term?.academicYear || ''}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-text-muted">{s.label || 'Term fees'}</td>
                    <td className="px-6 py-3 text-sm font-bold text-primary font-display text-right">{formatKES(s.amount)}</td>
                    <td className="px-6 py-3">{statusBadge(s.status)}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">{s.studentsInvoiced || 0}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      {s.status !== 'ARCHIVED' && (
                        <button onClick={() => openEdit(s)} className="text-sm font-semibold text-primary hover:underline">Edit</button>
                      )}
                      {s.status === 'DRAFT' && (
                        <>
                          <span className="text-slate-300">·</span>
                          <button onClick={() => handlePublish(s)} className="text-sm font-semibold text-emerald-700 hover:underline">Publish</button>
                          <span className="text-slate-300">·</span>
                          <button onClick={() => handleDelete(s)} className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <h3 className="text-lg font-bold text-text-main font-display">
                {editing ? 'Edit structure' : 'New fee structure'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Term *</label>
                <select
                  required
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  disabled={!!editing}
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white disabled:bg-slate-50"
                >
                  <option value="">Select a term</option>
                  {realTerms.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Class *</label>
                <select
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  disabled={editing && editing.status !== 'DRAFT'}
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white disabled:bg-slate-50"
                >
                  {CLASS_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Term fee (KES) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 25000"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                />
                <p className="text-xs text-text-muted mt-1">This is the total amount each student in the class will be invoiced for this term.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Label</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Term fees"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60">
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create structure'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Fees;
