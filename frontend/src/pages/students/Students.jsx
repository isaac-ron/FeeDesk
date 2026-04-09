import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock data
  const mockStudents = [
    { id: 1, admissionNumber: 'ADM-001', name: 'John Kamau', class: 'Form 4', balance: -12500, status: 'Active', parent: 'Peter Kamau', phone: '254712345678', arrears: 12500 },
    { id: 2, admissionNumber: 'ADM-002', name: 'Mary Wanjiru', class: 'Form 3', balance: 0, status: 'Active', parent: 'Jane Wanjiru', phone: '254723456789', arrears: 0 },
    { id: 3, admissionNumber: 'ADM-003', name: 'David Ochieng', class: 'Form 4', balance: -5000, status: 'Active', parent: 'James Ochieng', phone: '254734567890', arrears: 5000 },
    { id: 4, admissionNumber: 'ADM-004', name: 'Grace Akinyi', class: 'Form 2', balance: 2000, status: 'Active', parent: 'Susan Akinyi', phone: '254745678901', arrears: 0 },
    { id: 5, admissionNumber: 'ADM-005', name: 'Brian Kiprop', class: 'Form 3', balance: -8000, status: 'Active', parent: 'Paul Kiprop', phone: '254756789012', arrears: 8000 },
    { id: 6, admissionNumber: 'ADM-006', name: 'Faith Njeri', class: 'Form 1', balance: 0, status: 'Active', parent: 'Lucy Njeri', phone: '254767890123', arrears: 0 },
    { id: 7, admissionNumber: 'ADM-007', name: 'Kevin Mutua', class: 'Form 4', balance: -15000, status: 'Suspended', parent: 'John Mutua', phone: '254778901234', arrears: 15000 },
    { id: 8, admissionNumber: 'ADM-008', name: 'Mercy Adhiambo', class: 'Form 2', balance: 1500, status: 'Active', parent: 'Agnes Adhiambo', phone: '254789012345', arrears: 0 },
  ];

  useEffect(() => {
    setStudents(mockStudents);
  }, []);

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.status === 'Active').length,
    studentsWithArrears: students.filter(s => s.arrears > 0).length,
    totalArrears: students.reduce((sum, s) => sum + s.arrears, 0),
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'All' || student.class === filterClass;
    const matchesStatus = filterStatus === 'All' || student.status === filterStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    return `KES ${new Intl.NumberFormat('en-KE').format(absAmount)}`;
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
            <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Students</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center w-72 h-11 bg-slate-50 border border-surface-border rounded-full overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <div className="pl-4 pr-2 text-text-muted flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input 
                className="w-full bg-transparent border-none text-text-main text-sm placeholder:text-text-muted focus:ring-0 focus:outline-none h-full"
                placeholder="Search student or adm no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-blue-900 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-900/10"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Add Student</span>
            </button>
            <button className="size-11 flex items-center justify-center rounded-full bg-white border border-surface-border text-text-muted hover:text-primary hover:bg-slate-50 transition-all relative shadow-sm">
              <span className="material-symbols-outlined text-[22px]">more_vert</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Total Students */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <span className="material-symbols-outlined text-8xl text-primary">groups</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Students</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <span className="material-symbols-outlined text-primary text-lg">school</span>
                <p className="text-text-muted text-xs font-medium">Enrolled this year</p>
              </div>
            </div>

            {/* Active Students */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">check_circle</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Active Students</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {stats.activeStudents}
                </p>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-6">
                <div 
                  className="bg-green-500 h-2 rounded-full shadow-sm" 
                  style={{width: `${(stats.activeStudents / stats.totalStudents) * 100}%`}}
                ></div>
              </div>
              <p className="text-text-muted text-xs mt-2 font-medium">
                {Math.round((stats.activeStudents / stats.totalStudents) * 100)}% of total
              </p>
            </div>

            {/* Students with Arrears */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">warning</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">With Arrears</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {stats.studentsWithArrears}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-5 z-10">
                <div className="bg-orange-500/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-orange-500 text-sm">trending_up</span>
                  <p className="text-sm font-bold text-orange-500">
                    {Math.round((stats.studentsWithArrears / stats.totalStudents) * 100)}%
                  </p>
                </div>
                <p className="text-text-muted text-xs font-medium">need follow-up</p>
              </div>
            </div>

            {/* Total Arrears */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-surface-border bg-white shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -right-2 p-4 opacity-[0.03]">
                <span className="material-symbols-outlined text-8xl text-primary">account_balance</span>
              </div>
              <div className="flex flex-col gap-2 z-10">
                <p className="text-text-muted text-sm font-semibold uppercase tracking-wide">Total Arrears</p>
                <p className="text-text-main text-3xl font-extrabold tracking-tight font-display">
                  {formatCurrency(stats.totalArrears)}
                </p>
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
                <option value="Form 1">Form 1</option>
                <option value="Form 2">Form 2</option>
                <option value="Form 3">Form 3</option>
                <option value="Form 4">Form 4</option>
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
                <option value="Graduated">Graduated</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-surface-border rounded-lg text-sm font-medium text-text-main bg-white hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="rounded-2xl border border-surface-border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-surface-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Admission No.</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Class</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Parent/Guardian</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-primary">{student.admissionNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-semibold text-text-main">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{student.class}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{student.parent}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted font-mono">{student.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${student.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {student.balance < 0 ? '-' : '+'}{formatCurrency(student.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          student.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-text-muted hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;