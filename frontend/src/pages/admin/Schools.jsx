import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import platformService from '../../services/platformService';

const emptyForm = {
  name: '', code: '', paybillNumber: '', accountNumber: '',
  contactEmail: '', contactPhone: '',
  adminName: '', adminEmail: '', adminPassword: '',
};

const statusColors = {
  TRIAL: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
};

const Schools = () => {
  const { openSidebar } = useOutletContext() || {};
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [subModal, setSubModal] = useState(null); // school obj
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.subscriptionStatus = statusFilter;
      const res = await platformService.listSchools(params);
      setSchools(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchools(); /* eslint-disable-next-line */ }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await platformService.createSchool(form);
      setShowCreate(false);
      setForm(emptyForm);
      fetchSchools();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubscriptionUpdate = async (e) => {
    e.preventDefault();
    const payload = {
      subscriptionStatus: e.target.subscriptionStatus.value,
      subscriptionExpiry: e.target.subscriptionExpiry.value || undefined,
      maxStudents: Number(e.target.maxStudents.value) || undefined,
    };
    try {
      await platformService.updateSubscription(subModal._id, payload);
      setSubModal(null);
      fetchSchools();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeactivate = async () => {
    try {
      await platformService.deactivateSchool(confirmDeactivate._id);
      setConfirmDeactivate(null);
      fetchSchools();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Schools"
        subtitle="Manage all schools on the platform"
        onMenuClick={openSidebar}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Register School
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search by name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSchools()}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-border rounded-xl text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-surface-border rounded-xl text-sm"
          >
            <option value="">All statuses</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {loading && <div className="text-text-muted">Loading…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}

        {!loading && !error && (
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-surface-border">
                <tr className="text-left text-xs font-semibold text-text-muted uppercase">
                  <th className="px-6 py-4">School</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Paybill</th>
                  <th className="px-6 py-4">Students</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.length === 0 && (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-text-muted">No schools yet.</td></tr>
                )}
                {schools.map(s => (
                  <tr key={s._id} className="border-b border-surface-border last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-main">{s.name}</p>
                      <p className="text-xs text-text-muted">{s.contactEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{s.code}</td>
                    <td className="px-6 py-4 font-mono text-sm">{s.paybillNumber}</td>
                    <td className="px-6 py-4">{s.studentCount ?? 0} / {s.maxStudents}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[s.subscriptionStatus] || 'bg-slate-100 text-slate-700'}`}>
                        {s.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {s.subscriptionExpiry ? new Date(s.subscriptionExpiry).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSubModal(s)}
                        className="text-primary hover:underline text-sm font-semibold mr-3"
                      >
                        Subscription
                      </button>
                      {s.isActive && (
                        <button
                          onClick={() => setConfirmDeactivate(s)}
                          className="text-red-600 hover:underline text-sm font-semibold"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create School Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleCreate} className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-extrabold text-text-main font-display mb-2">Register New School</h2>
              <p className="text-text-muted text-sm mb-6">Creates the school and its initial admin account.</p>

              {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{formError}</div>}

              <h3 className="font-bold text-text-main mb-3">School Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <input required placeholder="School name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm col-span-2" />
                <input required placeholder="School code (e.g. GFA)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm" />
                <input required placeholder="Paybill number" value={form.paybillNumber} onChange={e => setForm({ ...form, paybillNumber: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm" />
                <input placeholder="Account number (optional)" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm col-span-2" />
                <input required type="email" placeholder="Contact email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm" />
                <input required placeholder="Contact phone (2547...)" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm" />
              </div>

              <h3 className="font-bold text-text-main mb-3">Initial Admin Account</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <input required placeholder="Admin full name" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm col-span-2" />
                <input required type="email" placeholder="Admin email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm" />
                <input required type="password" placeholder="Temp password (min 8)" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} className="border border-surface-border rounded-xl px-4 py-2.5 text-sm" />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCreate(false); setForm(emptyForm); setFormError(null); }} className="px-5 py-2.5 rounded-xl border border-surface-border font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-50">{saving ? 'Creating…' : 'Create School'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Subscription Modal */}
        {subModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubscriptionUpdate} className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-xl font-extrabold text-text-main font-display mb-1">Manage Subscription</h2>
              <p className="text-text-muted text-sm mb-6">{subModal.name}</p>

              <label className="block text-sm font-semibold text-text-main mb-1">Status</label>
              <select name="subscriptionStatus" defaultValue={subModal.subscriptionStatus} className="w-full border border-surface-border rounded-xl px-4 py-2.5 text-sm mb-4">
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
              </select>

              <label className="block text-sm font-semibold text-text-main mb-1">Expiry date</label>
              <input name="subscriptionExpiry" type="date" defaultValue={subModal.subscriptionExpiry ? new Date(subModal.subscriptionExpiry).toISOString().slice(0, 10) : ''} className="w-full border border-surface-border rounded-xl px-4 py-2.5 text-sm mb-4" />

              <label className="block text-sm font-semibold text-text-main mb-1">Max students</label>
              <input name="maxStudents" type="number" defaultValue={subModal.maxStudents} className="w-full border border-surface-border rounded-xl px-4 py-2.5 text-sm mb-6" />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSubModal(null)} className="px-5 py-2.5 rounded-xl border border-surface-border font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold">Save</button>
              </div>
            </form>
          </div>
        )}

        {/* Deactivate Confirm */}
        {confirmDeactivate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600">warning</span>
                </div>
                <h2 className="text-xl font-extrabold text-text-main font-display">Deactivate School</h2>
              </div>
              <p className="text-text-muted text-sm mb-6">
                This will suspend <strong>{confirmDeactivate.name}</strong>. Users will lose access until reactivated. This does not delete data.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeactivate(null)} className="px-5 py-2.5 rounded-xl border border-surface-border font-semibold">Cancel</button>
                <button onClick={handleDeactivate} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold">Deactivate</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Schools;
