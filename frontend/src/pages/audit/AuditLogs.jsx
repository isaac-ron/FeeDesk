import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { useAuditLogs } from '../../hooks/useAuditLogs';

const ENTITY_TYPES = ['FEE_STRUCTURE', 'TERM', 'PAYMENT', 'STUDENT', 'USER', 'SMS_CAMPAIGN', 'SCHOOL', 'OTHER'];

const ENTITY_STYLES = {
  FEE_STRUCTURE: { icon: 'receipt_long', color: 'bg-indigo-50 text-indigo-700' },
  TERM: { icon: 'event', color: 'bg-sky-50 text-sky-700' },
  PAYMENT: { icon: 'payments', color: 'bg-emerald-50 text-emerald-700' },
  STUDENT: { icon: 'school', color: 'bg-blue-50 text-blue-700' },
  USER: { icon: 'person', color: 'bg-violet-50 text-violet-700' },
  SMS_CAMPAIGN: { icon: 'sms', color: 'bg-amber-50 text-amber-700' },
  SCHOOL: { icon: 'apartment', color: 'bg-slate-100 text-slate-700' },
  OTHER: { icon: 'history', color: 'bg-slate-100 text-slate-600' },
};

const formatDate = (d) =>
  new Date(d).toLocaleString('en-KE', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const AuditLogs = () => {
  const { openSidebar } = useOutletContext() || {};
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const params = useMemo(() => ({
    entityType: entityType || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
    page,
    limit: 50,
  }), [entityType, action, from, to, page]);

  const { data, isLoading, error } = useAuditLogs(params);
  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const resetFilters = () => {
    setEntityType(''); setAction(''); setFrom(''); setTo(''); setPage(1);
  };

  const hasFilters = entityType || action || from || to;

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Record of significant actions taken on this school's data"
        onMenuClick={openSidebar}
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Entity</label>
              <select
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">All entities</option>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Action contains</label>
              <input
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                placeholder="e.g. publish, refund"
                className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border bg-slate-50">
            <p className="text-sm font-semibold text-text-muted">
              {pagination.total} {pagination.total === 1 ? 'entry' : 'entries'}
            </p>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-surface-border disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Prev
                </button>
                <span className="text-text-muted">Page {pagination.page} of {pagination.pages}</span>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-surface-border disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading audit log...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              <p className="text-sm text-red-600 font-medium">
                {error.response?.data?.message || 'Failed to load audit log.'}
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">history</span>
              <p className="text-sm text-text-muted font-medium">No audit entries match these filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-border">
              {logs.map((log) => {
                const style = ENTITY_STYLES[log.entityType] || ENTITY_STYLES.OTHER;
                const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                const isOpen = expanded === log._id;
                return (
                  <li key={log._id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.color}`}>
                        <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {log.action}
                          </span>
                          <span className="text-xs text-text-muted">·</span>
                          <span className="text-xs font-semibold text-text-muted">
                            {log.user?.name || 'System'}
                            {log.user?.role && <span className="text-text-muted/70"> ({log.user.role.replace('_', ' ')})</span>}
                          </span>
                        </div>
                        <p className="text-sm text-text-main mt-1">{log.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-xs text-text-muted">{formatDate(log.createdAt)}</p>
                          {hasMetadata && (
                            <button
                              onClick={() => setExpanded(isOpen ? null : log._id)}
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {isOpen ? 'expand_less' : 'expand_more'}
                              </span>
                              {isOpen ? 'Hide details' : 'Details'}
                            </button>
                          )}
                        </div>
                        {isOpen && hasMetadata && (
                          <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto">
{JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditLogs;
