import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import platformService from '../../services/platformService';

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const StatCard = ({ icon, label, value, accent = 'primary' }) => (
  <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className={`size-10 rounded-xl bg-${accent}/10 text-${accent} flex items-center justify-center`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-text-muted text-sm font-semibold">{label}</p>
    </div>
    <p className="text-2xl font-extrabold text-text-main font-display">{value}</p>
  </div>
);

const PlatformDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    platformService.getStats()
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-background-light">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-text-main font-display">Platform Overview</h1>
          <p className="text-text-muted mt-1">Monitor all schools on SchoolPay</p>
        </header>

        {loading && <div className="text-text-muted">Loading platform stats…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard icon="apartment" label="Total Schools" value={stats.schools?.total ?? 0} />
              <StatCard icon="check_circle" label="Active Schools" value={stats.schools?.active ?? 0} accent="emerald-600" />
              <StatCard icon="groups" label="Total Students" value={(stats.students?.active ?? 0).toLocaleString()} />
              <StatCard icon="payments" label="Platform Revenue" value={formatKES(stats.revenue?.total)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-surface-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-text-main font-display mb-4">Subscriptions</h2>
                <div className="space-y-3">
                  {Object.entries(stats.schools?.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                      <span className="text-sm font-semibold text-text-main capitalize">{status.toLowerCase()}</span>
                      <span className="text-sm font-bold text-primary">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.schools?.byStatus || {}).length === 0 && (
                    <p className="text-text-muted text-sm">No subscription data yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-surface-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-text-main font-display mb-4">Top Schools by Revenue</h2>
                <div className="space-y-3">
                  {(stats.topSchools || []).slice(0, 5).map((s, i) => (
                    <div key={s.schoolId} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-text-muted text-xs font-bold w-5">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-text-main">{s.schoolName}</p>
                          <p className="text-xs text-text-muted">{s.schoolCode} · {s.transactionCount} txns</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatKES(s.revenue)}</span>
                    </div>
                  ))}
                  {(!stats.topSchools || stats.topSchools.length === 0) && (
                    <p className="text-text-muted text-sm">No revenue data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PlatformDashboard;
