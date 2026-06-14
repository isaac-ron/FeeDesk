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
  useSetFeeCategories,
  useGenerateFeeStructures,
} from '../../hooks/useFees';

const CLASS_LEVELS = ['ALL', 'Grade 10', 'Grade 11', 'Grade 12'];

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

// Generate three DRAFT structures (Term 1/2/3 at 50:30:20) from one annual
// figure, pre-filled with the standard MoE voteheads. The bursar enters a
// single number — no manual percentages or votehead typing.
const PLAN_BADGE = {
  ready: 'bg-emerald-100 text-emerald-700',
  exists: 'bg-amber-100 text-amber-700',
  archived_term: 'bg-amber-100 text-amber-700',
  missing_term: 'bg-red-100 text-red-700',
};
const PLAN_LABEL = {
  ready: 'Will create',
  exists: 'Already exists',
  archived_term: 'Term archived',
  missing_term: 'No term',
};

const GenerateModal = ({ terms, activeTerm, onClose }) => {
  const generate = useGenerateFeeStructures();
  const years = [...new Set((terms || []).map((t) => t.academicYear))].sort().reverse();

  const [academicYear, setAcademicYear] = useState(activeTerm?.academicYear || years[0] || '');
  const [classLevel, setClassLevel] = useState('Grade 10');
  const [annual, setAnnual] = useState('');
  const [scope, setScope] = useState('boarding');
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  // Any input change invalidates a shown plan so a stale preview can't be read
  // as the thing about to be committed (the server recomputes either way).
  const onChange = (setter) => (val) => { setter(val); setPlan(null); setError(null); };

  const annualNum = Number(annual);
  const annualValid = Number.isFinite(annualNum) && annualNum > 0;

  const body = (extra) => ({ academicYear, classLevel, annual: annualNum, scope, ...extra });

  const doPreview = async () => {
    setError(null);
    try {
      const res = await generate.mutateAsync(body({ preview: true }));
      setPlan(res.plan || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Preview failed');
    }
  };

  const doCommit = async () => {
    setError(null);
    try {
      const res = await generate.mutateAsync(body({}));
      if (!res.count) {
        const why = (res.skipped || []).map((s) => `Term ${s.termNumber}: ${s.reason}`).join('; ');
        setError(why || 'Nothing created — structures already exist for this class.');
        return;
      }
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Generate failed');
    }
  };

  const cats = plan?.find((p) => p.categories?.length)?.categories || [];
  const readyCount = plan?.filter((p) => p.state === 'ready').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h3 className="text-lg font-bold text-text-main font-display">Generate from annual total</h3>
            <p className="text-xs text-text-muted">One annual fee → three terms (50:30:20) with standard voteheads</p>
          </div>
          <button type="button" onClick={onClose} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Academic year *</label>
              <select
                value={academicYear}
                onChange={(e) => onChange(setAcademicYear)(e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
              >
                {years.length === 0 && <option value="">No terms yet</option>}
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Class *</label>
              <select
                value={classLevel}
                onChange={(e) => onChange(setClassLevel)(e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
              >
                {CLASS_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Annual fee (KES) *</label>
            <input
              type="number" min="0" step="1"
              value={annual}
              onChange={(e) => onChange(setAnnual)(e.target.value)}
              placeholder="e.g. 53554"
              className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
            />
            <p className="text-xs text-text-muted mt-1">National / senior boarding is KES 53,554 per year. Term 1 bills 50%, Term 2 30%, Term 3 20%.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">School type</label>
            <div className="flex gap-2">
              {[{ k: 'boarding', l: 'Boarding' }, { k: 'day', l: 'Day' }].map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => onChange(setScope)(o.k)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    scope === o.k ? 'border-primary bg-primary/10 text-primary' : 'border-surface-border text-text-muted hover:bg-slate-50'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Plan preview */}
          {plan && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-2">
                {plan.map((p) => (
                  <div key={p.termNumber} className="rounded-xl border border-surface-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-muted">Term {p.termNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_BADGE[p.state]}`}>{PLAN_LABEL[p.state]}</span>
                    </div>
                    <p className="mt-1.5 text-base font-extrabold text-text-main font-display tabular-nums">{formatKES(p.amount)}</p>
                    <p className="text-[11px] text-text-muted">{p.termName || '—'}</p>
                  </div>
                ))}
              </div>

              {cats.length > 0 && (
                <div className="rounded-xl border border-surface-border overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-surface-border flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase">Voteheads (each term)</span>
                    <span className="text-xs font-bold text-text-muted">{cats.length} · annual KES</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {cats.map((c) => (
                      <div key={c.name} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-text-main">{c.name}</span>
                        <span className="flex items-center gap-3 tabular-nums">
                          <span className="text-text-muted text-xs">{c.percent}%</span>
                          <span className="font-semibold text-text-main w-24 text-right">{formatKES(Math.round(annualNum * c.percent / 100))}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium">Cancel</button>
          {!plan ? (
            <button
              type="button"
              onClick={doPreview}
              disabled={!annualValid || !academicYear || generate.isPending}
              className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60"
            >
              {generate.isPending ? 'Calculating…' : 'Preview split'}
            </button>
          ) : (
            <button
              type="button"
              onClick={doCommit}
              disabled={readyCount === 0 || generate.isPending}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-60"
            >
              {generate.isPending ? 'Generating…' : `Generate ${readyCount} draft${readyCount === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const blankCatRow = () => ({ name: '', percent: '' });

// Pro-rata category editor: percentage shares of the structure's flat amount
// (must total 100%). Edit rows directly or paste/upload a `category,percent`
// CSV. Presentation-only — it never changes the charged amount or any payment.
const CategoryModal = ({ structure, onClose }) => {
  const setCategories = useSetFeeCategories();
  const [rows, setRows] = useState(
    structure.categories?.length
      ? structure.categories.map((c) => ({ name: c.name, percent: String(c.percent) }))
      : [blankCatRow()]
  );
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState(null);

  const total = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.01;
  const allNamed = rows.every((r) => r.name.trim() && r.percent !== '');

  const updateRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, blankCatRow()]);
  const removeRow = (i) => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [blankCatRow()]);

  const loadCsv = () => {
    setError(null);
    try {
      const parsed = [];
      for (const line of csvText.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        const idx = t.indexOf(',');
        if (idx === -1) throw new Error(`Row needs "category,percent": ${t}`);
        const name = t.slice(0, idx).trim().replace(/^"|"$/g, '');
        const pct = Number(t.slice(idx + 1).replace('%', '').trim());
        if (!Number.isFinite(pct)) {
          if (parsed.length === 0) continue; // tolerate a header
          throw new Error(`Bad percent on row: ${t}`);
        }
        parsed.push({ name, percent: String(pct) });
      }
      if (!parsed.length) throw new Error('No category rows found in CSV');
      setRows(parsed);
    } catch (e) {
      setError(e.message);
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const save = async () => {
    setError(null);
    try {
      const categories = rows.map((r) => ({ name: r.name.trim(), percent: Number(r.percent) }));
      await setCategories.mutateAsync({ id: structure._id, categories });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save');
    }
  };

  const clear = async () => {
    setError(null);
    try {
      await setCategories.mutateAsync({ id: structure._id, categories: [] });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to clear');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h3 className="text-lg font-bold text-text-main font-display">Fee categories</h3>
            <p className="text-xs text-text-muted">{structure.classLevel} · {formatKES(structure.amount)} — split into percentage shares (must total 100%)</p>
          </div>
          <button type="button" onClick={onClose} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="Category (e.g. Tuition)"
                  className="flex-1 px-3 py-2 border border-surface-border rounded-lg text-sm"
                />
                <div className="relative w-24">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={r.percent}
                    onChange={(e) => updateRow(i, { percent: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-7 border border-surface-border rounded-lg text-sm text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">%</span>
                </div>
                <span className="w-24 text-right text-xs text-text-muted">{formatKES(((Number(r.percent) || 0) / 100) * structure.amount)}</span>
                <button type="button" onClick={() => removeRow(i)} className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
            <button type="button" onClick={addRow} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">add</span> Add category
            </button>
          </div>

          <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold ${totalOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <span>Total</span>
            <span>{total.toFixed(2)}% {totalOk ? '✓' : '— must be 100%'}</span>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-text-muted font-semibold select-none">Paste / upload CSV</summary>
            <div className="mt-2 space-y-2">
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={4}
                placeholder={'category,percent\nTuition,60\nBoarding,30\nActivity,10'}
                className="w-full px-3 py-2 border border-surface-border rounded-lg text-xs font-mono"
              />
              <div className="flex items-center gap-4">
                <button type="button" onClick={loadCsv} className="text-sm font-semibold text-primary hover:underline">Load into rows</button>
                <label className="text-sm font-semibold text-text-muted hover:text-primary cursor-pointer">
                  Upload .csv
                  <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                </label>
              </div>
            </div>
          </details>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-border">
          <button
            type="button"
            onClick={clear}
            disabled={setCategories.isPending || !structure.categories?.length}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Clear
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium">Cancel</button>
            <button
              type="button"
              onClick={save}
              disabled={setCategories.isPending || !totalOk || !allNamed}
              className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60"
            >
              {setCategories.isPending ? 'Saving…' : 'Save categories'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Fees = () => {
  const { openSidebar } = useOutletContext() || {};
  const { terms, activeTerm } = useContext(TermContext);

  const [filterTerm, setFilterTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ term: '', classLevel: 'ALL', amount: '', label: 'Term fees' });
  const [formError, setFormError] = useState(null);
  const [catStructure, setCatStructure] = useState(null);

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
          <>
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-2 h-11 px-5 bg-white border border-surface-border hover:bg-slate-50 text-text-main text-sm font-bold rounded-full"
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              <span className="hidden sm:inline">Generate from annual</span>
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 h-11 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-full shadow-lg shadow-primary/10"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              New structure
            </button>
          </>
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
                    <td className="px-6 py-3 text-sm text-text-muted">
                      {s.label || 'Term fees'}
                      {s.categories?.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">{s.categories.length} cat.</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-primary font-display text-right">{formatKES(s.amount)}</td>
                    <td className="px-6 py-3">{statusBadge(s.status)}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">{s.studentsInvoiced || 0}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      {s.status !== 'ARCHIVED' && (
                        <>
                          <button onClick={() => openEdit(s)} className="text-sm font-semibold text-primary hover:underline">Edit</button>
                          <span className="text-slate-300">·</span>
                          <button onClick={() => setCatStructure(s)} className="text-sm font-semibold text-primary hover:underline">Categories</button>
                        </>
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

      {catStructure && (
        <CategoryModal structure={catStructure} onClose={() => setCatStructure(null)} />
      )}

      {showGenerate && (
        <GenerateModal terms={realTerms} activeTerm={activeTerm} onClose={() => setShowGenerate(false)} />
      )}
    </>
  );
};

export default Fees;
