import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import feeService from '../../services/feeService';

const FEE_TYPES = ['TUITION', 'BOARDING', 'TRANSPORT', 'UNIFORM', 'BOOKS', 'EXAMINATION', 'OTHER'];
const TERMS = ['TERM_1', 'TERM_2', 'TERM_3', 'ANNUAL'];
const CLASS_LEVELS = ['ALL', 'Grade 10', 'Grade 11', 'Grade 12'];
const CURRENT_YEAR = new Date().getFullYear().toString();

const EMPTY_FORM = {
  name: '',
  amount: '',
  type: 'TUITION',
  term: 'TERM_1',
  academicYear: CURRENT_YEAR,
  classLevel: 'ALL',
  description: '',
  dueDate: '',
};

const Fees = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTerm, setFilterTerm] = useState('All');
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { academicYear: filterYear };
      if (filterTerm !== 'All') params.term = filterTerm;
      const data = await feeService.getFees(params);
      setFees(data.data || []);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
      setError('Failed to load fees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterTerm, filterYear]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const totalExpected = fees.filter(f => f.isActive).reduce((s, f) => s + f.amount, 0);
  const activeFees = fees.filter(f => f.isActive).length;

  const formatCurrency = (amount) => `KES ${new Intl.NumberFormat('en-KE').format(amount)}`;
  const termLabel = (t) => t.replace('_', ' ');

  const openCreateModal = () => {
    setEditingFee(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (fee) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      amount: fee.amount,
      type: fee.type,
      term: fee.term,
      academicYear: fee.academicYear,
      classLevel: fee.classLevel,
      description: fee.description || '',
      dueDate: fee.dueDate ? fee.dueDate.split('T')[0] : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate || undefined,
      };
      if (editingFee) {
        await feeService.updateFee(editingFee._id, payload);
      } else {
        await feeService.createFee(payload);
      }
      setShowModal(false);
      fetchFees();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save fee. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (fee) => {
    try {
      await feeService.updateFee(fee._id, { isActive: !fee.isActive });
      fetchFees();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleDelete = async (feeId) => {
    try {
      await feeService.deleteFee(feeId);
      setDeleteConfirm(null);
      fetchFees();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-surface-border bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <button className="lg:hidden text-text-main">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Fee Management</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-900/10"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Add Fee</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm">
              <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Fee Structures</p>
              <p className="text-text-main text-3xl font-extrabold tracking-tight font-display mt-2">{fees.length}</p>
            </div>
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm">
              <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Active Fees</p>
              <p className="text-text-main text-3xl font-extrabold tracking-tight font-display mt-2">{activeFees}</p>
            </div>
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm">
              <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Expected ({filterYear})</p>
              <p className="text-text-main text-3xl font-extrabold tracking-tight font-display mt-2">{formatCurrency(totalExpected)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">Year:</label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-24 px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">Term:</label>
              <select
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                className="px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="All">All Terms</option>
                {TERMS.map(t => <option key={t} value={t}>{termLabel(t)}</option>)}
              </select>
            </div>
          </div>

          {/* Fees Table */}
          <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-text-muted gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading fees...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                <p className="text-sm text-red-500 font-medium">{error}</p>
                <button onClick={fetchFees} className="text-sm text-primary underline">Retry</button>
              </div>
            ) : fees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">receipt</span>
                <p className="text-sm text-text-muted font-medium">No fees configured for this period</p>
                <button onClick={openCreateModal} className="text-sm text-primary underline">Create your first fee structure</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-surface-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Fee Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Term</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Class</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {fees.map((fee) => (
                      <tr key={fee._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-bold text-text-main">{fee.name}</p>
                            {fee.description && <p className="text-xs text-text-muted mt-0.5">{fee.description}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{fee.type}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{termLabel(fee.term)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{fee.classLevel}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-primary">{formatCurrency(fee.amount)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                          {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-KE') : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(fee)}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                              fee.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {fee.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(fee)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-slate-100 transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(fee._id)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <h3 className="text-lg font-bold text-text-main font-display">
                {editingFee ? 'Edit Fee' : 'Add Fee Structure'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-text-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Fee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Term 1 Tuition Fee"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Amount (KES) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    name="amount"
                    value={formData.amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 45000"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Fee Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                  >
                    {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Term <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    name="term"
                    value={formData.term}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                  >
                    {TERMS.map(t => <option key={t} value={t}>{termLabel(t)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="2020"
                    max="2030"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Applies To</label>
                  <select
                    name="classLevel"
                    value={formData.classLevel}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                  >
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Classes' : c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={2}
                    placeholder="Optional notes..."
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium text-text-main hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">{editingFee ? 'save' : 'add'}</span>
                  )}
                  {formLoading ? 'Saving...' : editingFee ? 'Save Changes' : 'Add Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="size-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-red-500">delete</span>
            </div>
            <h3 className="text-lg font-bold text-text-main mb-2">Delete Fee?</h3>
            <p className="text-sm text-text-muted mb-6">This action cannot be undone.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium text-text-main hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
