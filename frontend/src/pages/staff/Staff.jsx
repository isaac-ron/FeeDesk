import Sidebar from '../../components/layout/Sidebar';

const Staff = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <header className="flex items-center px-8 py-5 border-b border-surface-border bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Staff Management</h2>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl text-slate-400">group</span>
            </div>
            <h3 className="text-xl font-bold text-text-main font-display">Staff Management</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Manage school staff accounts, roles, and permissions. This module is coming in the next release.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-primary text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staff;
