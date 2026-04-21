import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { useStudents, useCreateStudent, useImportStudents } from '../../hooks/useStudents';

const CLASS_LEVELS = ['Grade 10', 'Grade 11', 'Grade 12'];

const EMPTY_FORM = {
  admissionNumber: '',
  name: '',
  classLevel: 'Grade 10',
  stream: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
};

const Students = () => {
  const { openSidebar } = useOutletContext() || {};
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  // Debounce search input
  const [searchTimer, setSearchTimer] = useState(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => setDebouncedSearch(val.trim()), 300));
  };

  const queryParams = useMemo(() => {
    const p = {};
    if (filterStatus !== 'All') p.status = filterStatus;
    if (filterClass !== 'All') p.classLevel = filterClass;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [filterStatus, filterClass, debouncedSearch]);

  const { data, isLoading: loading, error: queryError, refetch: fetchStudents } = useStudents(queryParams);
  const students = data?.data || [];
  const error = queryError ? 'Failed to load students. Please try again.' : null;

  const createMutation = useCreateStudent();
  const importMutation = useImportStudents();

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.status === 'Active').length,
    studentsWithArrears: students.filter(s => s.currentBalance < 0).length,
    totalArrears: students.reduce((sum, s) => sum + (s.currentBalance < 0 ? Math.abs(s.currentBalance) : 0), 0),
  };

  const formatCurrency = (amount) => {
    const abs = Math.abs(amount);
    return `KES ${new Intl.NumberFormat('en-KE').format(abs)}`;
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await createMutation.mutateAsync(formData);
      setShowAddModal(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add student. Please try again.');
    }
  };
  const formLoading = createMutation.isPending;

  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowAddModal(true);
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
    setShowImportModal(true);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportError(null);
    setImportResult(null);
    try {
      const csv = await importFile.text();
      const result = await importMutation.mutateAsync(csv);
      setImportResult(result);
    } catch (err) {
      setImportError(err.response?.data?.message || 'Import failed. Check your file and try again.');
    }
  };
  const importing = importMutation.isPending;

  const downloadTemplate = () => {
    const csv = 'admissionNumber,name,classLevel,stream,guardianName,guardianPhone,guardianEmail\nADM-001,John Kamau,Grade 10,East,Jane Kamau,254712345678,jane@example.com\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Students"
        onMenuClick={openSidebar}
        actions={
          <>
            <div className="relative hidden md:flex items-center w-72 h-11 bg-slate-50 border border-surface-border rounded-full overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <div className="pl-4 pr-2 text-text-muted flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                className="w-full bg-transparent border-none text-text-main text-sm placeholder:text-text-muted focus:ring-0 focus:outline-none h-full"
                placeholder="Search student or adm no..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <button
              onClick={openImportModal}
              className="flex items-center justify-center gap-2 h-11 px-5 bg-white border border-surface-border hover:bg-slate-50 text-text-main text-sm font-bold rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-900/10"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Add Student</span>
            </button>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <span className="material-symbols-outlined text-8xl text-primary">groups</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Students</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{stats.totalStudents}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-primary text-lg">school</span>
                <p className="text-text-muted text-xs font-medium">Enrolled this year</p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">check_circle</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Active Students</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{stats.activeStudents}</p>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-6">
                <div
                  className="bg-green-500 h-2 rounded-full shadow-sm"
                  style={{ width: stats.totalStudents > 0 ? `${(stats.activeStudents / stats.totalStudents) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-text-muted text-xs mt-2 font-medium">
                {stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}% of total
              </p>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">warning</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">With Arrears</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{stats.studentsWithArrears}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <div className="bg-orange-500/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-orange-500 text-sm">trending_up</span>
                  <p className="text-sm font-bold text-orange-500">
                    {stats.totalStudents > 0 ? Math.round((stats.studentsWithArrears / stats.totalStudents) * 100) : 0}%
                  </p>
                </div>
                <p className="text-text-muted text-xs font-medium">need follow-up</p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">account_balance</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Arrears</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">{formatCurrency(stats.totalArrears)}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                <p className="text-text-muted text-xs font-medium">Outstanding balance</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">Class:</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="All">All Classes</option>
                {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Alumni">Alumni</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-text-muted gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading students...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                <p className="text-sm text-red-500 font-medium">{error}</p>
                <button onClick={fetchStudents} className="text-sm text-primary underline">Retry</button>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">group</span>
                <p className="text-sm text-text-muted font-medium">No students found</p>
                <button onClick={openAddModal} className="text-sm text-primary underline">Add your first student</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-surface-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Admission No.</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Class</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Guardian</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {students.map((student) => (
                      <tr
                        key={student._id}
                        onClick={() => navigate(`/students/${student._id}/ledger`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-primary">{student.admissionNumber}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-sm font-semibold text-text-main">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{student.classLevel}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{student.guardianName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted font-mono">{student.guardianPhone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-bold ${student.currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {student.currentBalance < 0 ? '-' : '+'}{formatCurrency(student.currentBalance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <h3 className="text-lg font-bold text-text-main font-display">Import students from CSV</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-text-muted"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleImport} className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-surface-border text-sm text-text-muted space-y-2">
                <p className="font-semibold text-text-main">Required columns:</p>
                <p className="font-mono text-xs">admissionNumber, name, classLevel, guardianName, guardianPhone</p>
                <p>Optional: <span className="font-mono text-xs">stream, guardianEmail</span>. Class must be Grade 10/11/12.</p>
                <button type="button" onClick={downloadTemplate} className="text-primary font-semibold underline text-xs">
                  Download template
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">CSV file</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); setImportError(null); }}
                  className="w-full text-sm"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{importError}</div>
              )}

              {importResult && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
                    Imported {importResult.createdCount} student{importResult.createdCount === 1 ? '' : 's'}
                    {importResult.errorCount > 0 && ` · ${importResult.errorCount} row${importResult.errorCount === 1 ? '' : 's'} skipped`}
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-surface-border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-bold text-text-muted">Row</th>
                            <th className="px-3 py-2 font-bold text-text-muted">Adm No</th>
                            <th className="px-3 py-2 font-bold text-text-muted">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.errors.map((err, i) => (
                            <tr key={i} className="border-t border-surface-border">
                              <td className="px-3 py-2">{err.row}</td>
                              <td className="px-3 py-2 font-mono">{err.admissionNumber || '—'}</td>
                              <td className="px-3 py-2 text-red-600">{err.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-2.5 rounded-lg border border-surface-border text-sm font-medium text-text-main hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing…' : 'Upload & import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <h3 className="text-lg font-bold text-text-main font-display">Add New Student</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-text-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Admission Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="admissionNumber"
                    value={formData.admissionNumber}
                    onChange={handleFormChange}
                    placeholder="e.g. ADM-001"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. John Kamau"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    name="classLevel"
                    value={formData.classLevel}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                  >
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Stream</label>
                  <input
                    name="stream"
                    value={formData.stream}
                    onChange={handleFormChange}
                    placeholder="e.g. East, West"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Guardian Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleFormChange}
                    placeholder="e.g. Jane Kamau"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    Guardian Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleFormChange}
                    placeholder="254712345678"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Guardian Email</label>
                  <input
                    type="email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleFormChange}
                    placeholder="guardian@email.com"
                    className="w-full px-4 py-2.5 border border-surface-border rounded-lg text-sm text-text-main focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                  )}
                  {formLoading ? 'Saving...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Students;
