import { useContext, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { TermContext } from '../../context/TermContext';
import api from '../../services/api';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-KE') : '—');

const emptyForm = () => ({
  name: '',
  academicYear: String(new Date().getFullYear()),
  termNumber: 1,
  startDate: '',
  endDate: '',
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BAND = {
  ACTIVE: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-800',
  DRAFT: 'bg-primary/10 border-primary/40 text-primary',
  ARCHIVED: 'bg-amber-500/15 border-amber-500/50 text-amber-800',
};

// Fraction of the year (0–12) for a date, including the day for smooth placement.
const yearPos = (d) => {
  const dt = new Date(d);
  const daysInMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  return dt.getMonth() + (dt.getDate() - 1) / daysInMonth;
};

// Visual academic calendar: each term drawn as a band across the 12 months of a
// selected year. Replaces "another list" with an at-a-glance year view, and the
// year selector makes it multi-year aware.
const TermCalendar = ({ terms }) => {
  const years = [...new Set(terms.map((t) => t.academicYear))].sort().reverse();
  const [year, setYear] = useState(years[0] || String(new Date().getFullYear()));

  const yearTerms = terms
    .filter((t) => t.academicYear === year && t.startDate && t.endDate)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const now = new Date();
  const showToday = String(now.getFullYear()) === String(year);
  const todayLeft = (yearPos(now) / 12) * 100;

  return (
    <div className="bg-white border border-line rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-header text-lg font-bold text-ink">Academic calendar</h3>
          <p className="text-sm text-body">Terms across {year}</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 border border-line rounded-lg text-sm bg-white"
        >
          {years.length === 0 && <option value={year}>{year}</option>}
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-12 mb-2">
        {MONTHS.map((m) => (
          <div key={m} className="text-center text-[11px] font-mono-brand uppercase tracking-wide text-body">{m}</div>
        ))}
      </div>

      <div className="relative h-16 rounded-xl bg-paper border border-line overflow-hidden">
        {/* month gridlines */}
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
          {MONTHS.map((_, i) => (
            <div key={i} className={i === 0 ? '' : 'border-l border-line/70'} />
          ))}
        </div>

        {/* today marker */}
        {showToday && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-20" style={{ left: `${todayLeft}%` }}>
            <span className="absolute top-1 left-1 text-[9px] font-bold text-primary">Today</span>
          </div>
        )}

        {/* term bands */}
        {yearTerms.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-body">No dated terms for {year}.</p>
        ) : (
          yearTerms.map((t) => {
            const left = (yearPos(t.startDate) / 12) * 100;
            const width = Math.max(5, ((yearPos(t.endDate) - yearPos(t.startDate)) / 12) * 100);
            return (
              <div
                key={t._id}
                className={`absolute top-2 bottom-2 rounded-lg border flex flex-col justify-center px-3 overflow-hidden ${BAND[t.status] || BAND.DRAFT}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${t.name} · ${formatDate(t.startDate)} – ${formatDate(t.endDate)} · ${t.status}`}
              >
                <span className="text-xs font-bold truncate leading-tight">{t.name}</span>
                <span className="text-[10px] opacity-80 truncate leading-tight">{formatDate(t.startDate)} – {formatDate(t.endDate)}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-body">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" />Active</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Draft / upcoming</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-500" />Archived</span>
      </div>
    </div>
  );
};

const Terms = () => {
  const { openSidebar } = useOutletContext() || {};
  const { terms, refresh, loading } = useContext(TermContext);
  const realTerms = (terms || []).filter((t) => t._id !== 'fallback');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/terms', {
        name: form.name,
        academicYear: form.academicYear,
        termNumber: Number(form.termNumber),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setShowModal(false);
      refresh();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create term.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (t) => {
    if (!window.confirm(`Activate "${t.name}"? The currently active term will be archived.`)) return;
    try {
      await api.post(`/terms/${t._id}/activate`);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Activate failed.');
    }
  };

  const handleArchive = async (t) => {
    if (!window.confirm(`Archive "${t.name}"?`)) return;
    try {
      await api.post(`/terms/${t._id}/archive`);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Archive failed.');
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete DRAFT term "${t.name}"?`)) return;
    try {
      await api.delete(`/terms/${t._id}`);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <>
      <PageHeader
        title="Terms"
        subtitle="Create, activate, and archive academic terms"
        onMenuClick={openSidebar}
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 h-11 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-full shadow-lg shadow-primary/10"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New term
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

        {realTerms.length > 0 && <TermCalendar terms={realTerms} />}

        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm">Loading…</div>
          ) : realTerms.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">event</span>
              <p className="text-text-muted mt-2 mb-4">No terms yet. Create one to get started.</p>
              <button onClick={openCreate} className="text-primary font-semibold text-sm underline">
                Create your first term
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-surface-border">
                <tr className="text-left text-xs font-bold text-text-muted uppercase">
                  <th className="px-6 py-3">Term</th>
                  <th className="px-6 py-3">Academic year</th>
                  <th className="px-6 py-3">Start</th>
                  <th className="px-6 py-3">End</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {realTerms.map((t) => (
                  <tr key={t._id} className="border-b border-surface-border last:border-0">
                    <td className="px-6 py-3 text-sm font-semibold text-text-main">{t.name}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">{t.academicYear}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">{formatDate(t.startDate)}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">{formatDate(t.endDate)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[t.status] || 'bg-slate-100 text-slate-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      {t.status === 'DRAFT' && (
                        <>
                          <button onClick={() => handleActivate(t)} className="text-sm font-semibold text-emerald-700 hover:underline">
                            Activate
                          </button>
                          <span className="text-slate-300">·</span>
                          <button onClick={() => handleDelete(t)} className="text-sm font-semibold text-red-600 hover:underline">
                            Delete
                          </button>
                        </>
                      )}
                      {t.status === 'ACTIVE' && (
                        <button onClick={() => handleArchive(t)} className="text-sm font-semibold text-amber-700 hover:underline">
                          Archive
                        </button>
                      )}
                      {t.status === 'ARCHIVED' && <span className="text-xs text-text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <h3 className="text-lg font-bold text-text-main font-display">New term</h3>
              <button type="button" onClick={() => setShowModal(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Term 1 2026"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Academic year *</label>
                  <input
                    required
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Term number *</label>
                  <select
                    value={form.termNumber}
                    onChange={(e) => setForm({ ...form, termNumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">End date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60">
                {saving ? 'Creating…' : 'Create term'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Terms;
