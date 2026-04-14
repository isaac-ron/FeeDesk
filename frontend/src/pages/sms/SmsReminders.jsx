import { useEffect, useState, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { TermContext } from '../../context/TermContext';
import api from '../../services/api';

const CLASS_LEVELS = ['ALL', 'Grade 10', 'Grade 11', 'Grade 12'];

const DEFAULT_TEMPLATE =
  'Dear {parent_name}, this is a reminder that {student_name} ({admission_number}, {class}) has an outstanding fee balance of KES {balance}. Pay via Paybill {paybill}. - {school_name}';

const statusPill = (status) => {
  const map = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    SENDING: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
};

const SmsReminders = () => {
  const { openSidebar } = useOutletContext() || {};
  const { terms, activeTerm } = useContext(TermContext);
  const realTerms = (terms || []).filter(t => t._id !== 'fallback');

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState({
    classLevel: 'ALL',
    termId: '',
    minOutstanding: '',
    daysOverdue: '',
  });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [name, setName] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!filter.termId && activeTerm?._id && activeTerm._id !== 'fallback') {
      setFilter(f => ({ ...f, termId: activeTerm._id }));
    }
  }, [activeTerm]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/sms/campaigns');
      setCampaigns(data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const buildPayload = () => ({
    name: name || undefined,
    messageTemplate: template,
    filter: {
      classLevel: filter.classLevel || 'ALL',
      termId: filter.termId || undefined,
      minOutstanding: filter.minOutstanding !== '' ? Number(filter.minOutstanding) : undefined,
      daysOverdue: filter.daysOverdue !== '' ? Number(filter.daysOverdue) : undefined,
    },
  });

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const { data } = await api.post('/sms/campaigns/preview', buildPayload());
      setPreview(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!preview || preview.recipientCount === 0) {
      setError('Run preview and confirm recipients before sending.');
      return;
    }
    if (!window.confirm(`Send ${preview.recipientCount} SMS now?`)) return;
    setSending(true);
    setError(null);
    try {
      await api.post('/sms/campaigns', buildPayload());
      setSuccess(`Campaign queued for ${preview.recipientCount} recipients.`);
      setPreview(null);
      fetchCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="SMS reminders"
        subtitle="Send bulk fee reminders with per-student templates"
        onMenuClick={openSidebar}
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-surface-border rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-text-main font-display">New bulk reminder</h2>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Campaign name (optional)</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Term 1 arrears reminder"
                className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Class</label>
                <select
                  value={filter.classLevel}
                  onChange={e => setFilter({ ...filter, classLevel: e.target.value })}
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                >
                  {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Term</label>
                <select
                  value={filter.termId}
                  onChange={e => setFilter({ ...filter, termId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                >
                  <option value="">Any</option>
                  {realTerms.map(t => <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Min outstanding (KES)</label>
                <input
                  type="number"
                  min="0"
                  value={filter.minOutstanding}
                  onChange={e => setFilter({ ...filter, minOutstanding: e.target.value })}
                  placeholder="e.g. 1000"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Days overdue</label>
                <input
                  type="number"
                  min="0"
                  value={filter.daysOverdue}
                  onChange={e => setFilter({ ...filter, daysOverdue: e.target.value })}
                  placeholder="e.g. 7"
                  className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                Message template
              </label>
              <textarea
                rows={5}
                value={template}
                onChange={e => setTemplate(e.target.value)}
                className="w-full px-4 py-3 border border-surface-border rounded-lg text-sm bg-white font-mono"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Placeholders: {'{parent_name}'}, {'{student_name}'}, {'{admission_number}'}, {'{class}'}, {'{balance}'}, {'{paybill}'}, {'{school_name}'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="px-5 py-2.5 rounded-lg border border-primary text-primary text-sm font-bold disabled:opacity-60"
              >
                {previewing ? 'Previewing…' : 'Preview'}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !preview}
                className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send now'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-surface-border rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-text-main font-display">Preview</h3>
            {!preview ? (
              <p className="text-sm text-text-muted">Run preview to see how many recipients match and a sample rendered message.</p>
            ) : (
              <>
                <div>
                  <p className="text-xs text-text-muted font-semibold uppercase">Recipients</p>
                  <p className="text-3xl font-extrabold text-primary font-display">{preview.recipientCount}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted font-semibold uppercase">Estimated cost</p>
                  <p className="text-lg font-bold text-text-main">KES {Number(preview.estimatedCostKes || 0).toLocaleString()}</p>
                </div>
                {preview.sample && (
                  <div className="bg-slate-50 border border-surface-border rounded-xl p-3">
                    <p className="text-xs text-text-muted font-semibold uppercase mb-1">Sample</p>
                    <p className="text-xs text-text-muted">{preview.sample.studentName} · {preview.sample.guardianPhone}</p>
                    <p className="text-sm text-text-main mt-2 whitespace-pre-wrap">{preview.sample.renderedMessage}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-base font-bold text-text-main font-display">Recent campaigns</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">No campaigns yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-surface-border">
                <tr className="text-left text-xs font-bold text-text-muted uppercase">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Recipients</th>
                  <th className="px-6 py-3 text-right">Sent</th>
                  <th className="px-6 py-3 text-right">Failed</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c._id} className="border-b border-surface-border last:border-0">
                    <td className="px-6 py-3 text-sm font-semibold text-text-main">{c.name || '(untitled)'}</td>
                    <td className="px-6 py-3">{statusPill(c.status)}</td>
                    <td className="px-6 py-3 text-right text-sm">{c.recipientCount || 0}</td>
                    <td className="px-6 py-3 text-right text-sm text-emerald-600 font-semibold">{c.sentCount || 0}</td>
                    <td className="px-6 py-3 text-right text-sm text-red-600 font-semibold">{c.failedCount || 0}</td>
                    <td className="px-6 py-3 text-sm text-text-muted">{new Date(c.createdAt).toLocaleString('en-KE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default SmsReminders;
