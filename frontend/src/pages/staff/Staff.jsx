import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import api from '../../services/api';

const ROLES = ['admin', 'bursar', 'principal', 'teacher'];

const ROLE_LABELS = {
  admin: 'Admin',
  bursar: 'Bursar',
  principal: 'Principal',
  teacher: 'Teacher',
  super_admin: 'Super Admin',
};

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  bursar: 'bg-blue-100 text-blue-700',
  principal: 'bg-amber-100 text-amber-700',
  teacher: 'bg-green-100 text-green-700',
  super_admin: 'bg-red-100 text-red-700',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'teacher' };

const Staff = () => {
  const { openSidebar } = useOutletContext() || {};
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterRole !== 'All') params.role = filterRole;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const { data } = await api.get('/staff', { params });
      setStaff(data.data || []);
    } catch (err) {
      setError('Failed to load staff. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterRole, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchStaff, 300);
    return () => clearTimeout(timer);
  }, [fetchStaff]);

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.isActive !== false).length,
    admins: staff.filter(s => s.role === 'admin').length,
    teachers: staff.filter(s => s.role === 'teacher').length,
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditingStaff(member);
    setFormData({ name: member.name, email: member.email, password: '', role: member.role });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      if (editingStaff) {
        const updates = { name: formData.name, email: formData.email, role: formData.role };
        await api.put(`/staff/${editingStaff._id}`, updates);
      } else {
        await api.post('/staff', formData);
      }
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.delete(`/staff/${id}`);
      setDeleteConfirm(null);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate staff member.');
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        onMenuClick={openSidebar}
        actions={
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Staff
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Staff', value: stats.total, icon: 'group', color: 'text-primary' },
                { label: 'Active', value: stats.active, icon: 'check_circle', color: 'text-green-600' },
                { label: 'Admins', value: stats.admins, icon: 'admin_panel_settings', color: 'text-purple-600' },
                { label: 'Teachers', value: stats.teachers, icon: 'school', color: 'text-blue-600' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-4 p-4 rounded-xl border border-surface-border bg-white shadow-sm">
                  <div className={`size-10 rounded-lg bg-slate-50 flex items-center justify-center ${stat.color}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-text-main font-display">{stat.value}</p>
                    <p className="text-xs font-medium text-text-muted">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-surface-border rounded-xl text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2.5 border border-surface-border rounded-xl text-sm font-medium bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="All">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            {/* Table */}
            <div className="rounded-xl border border-surface-border bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <span className="material-symbols-outlined text-3xl text-slate-300">group_off</span>
                  <p className="text-sm text-text-muted">No staff members found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold text-text-muted uppercase tracking-wider border-b border-surface-border bg-slate-50">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Last Login</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((member) => (
                      <tr key={member._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-primary border border-slate-200">
                              {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-text-main">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted">{member.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[member.role] || 'bg-slate-100 text-slate-600'}`}>
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${member.isActive !== false ? 'text-green-600' : 'text-slate-400'}`}>
                            <span className={`size-2 rounded-full ${member.isActive !== false ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                            {member.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted">
                          {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString('en-KE') : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-text-muted hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            {member.isActive !== false && (
                              <button
                                onClick={() => setDeleteConfirm(member)}
                                className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors"
                                title="Deactivate"
                              >
                                <span className="material-symbols-outlined text-[18px]">person_off</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-main font-display">
                  {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-text-muted">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Full Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="john@school.edu"
                  />
                </div>

                {!editingStaff && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-600">Password</label>
                    <input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      required
                      minLength={8}
                      className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    required
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>

                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? 'Saving...' : editingStaff ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center space-y-4">
              <div className="size-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl text-red-600">person_off</span>
              </div>
              <h3 className="text-lg font-bold text-text-main font-display">Deactivate Staff?</h3>
              <p className="text-sm text-text-muted">
                Are you sure you want to deactivate <strong>{deleteConfirm.name}</strong>? They will no longer be able to log in.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeactivate(deleteConfirm._id)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow transition-all"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default Staff;
