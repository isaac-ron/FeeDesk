// Per-page topbar. Every page renders exactly one of these at the top of its
// Outlet — Layout owns the shell (sidebar + flex column wrapper) and
// PageHeader is the only thing a page needs to declare its title + actions.
//
// Usage:
//   <PageHeader
//     title="Fee Structures"
//     subtitle="Grade 10 · Term 1 2026"
//     actions={<button>+ New structure</button>}
//   />
const PageHeader = ({ title, subtitle, actions, onMenuClick }) => (
  <header className="flex items-center justify-between px-8 py-5 border-b border-line bg-paper/80 backdrop-blur-md sticky top-0 z-10">
    <div className="flex items-center gap-4">
      <button
        className="lg:hidden text-text-main"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
      <div className="flex flex-col">
        <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">
          {title}
        </h2>
        {subtitle && (
          <p className="text-text-muted text-sm font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </header>
);

export default PageHeader;
