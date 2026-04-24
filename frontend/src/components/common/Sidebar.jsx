import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/students', label: 'Students', icon: '👥' },
    { path: '/finance', label: 'Finance', icon: '💰' },
    { path: '/reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <aside style={{
      width: '250px',
      background: '#1f2937',
      color: 'white',
      padding: '2rem 1rem'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>FeeDesk</h2>
      </div>
      <nav>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              marginBottom: '0.5rem',
              background: isActive ? '#374151' : 'transparent',
              color: 'white',
              transition: 'background 0.2s'
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;