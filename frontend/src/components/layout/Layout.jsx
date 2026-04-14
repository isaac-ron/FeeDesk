import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';

// The real dashboard shell. Every authenticated page renders inside this —
// pages only supply their own <PageHeader /> + content; the sidebar, mobile
// overlay, and flex-column wrapper live here. Previously every page
// mounted its own Sidebar and duplicated the outer wrapper divs.
const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white min-w-0">
        {/* Pages render <PageHeader /> + their content here. The Outlet
            context exposes a mobile-menu opener so PageHeader's hamburger
            button can toggle the sidebar on small screens. */}
        <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
      </div>
    </div>
  );
};

export default Layout;
