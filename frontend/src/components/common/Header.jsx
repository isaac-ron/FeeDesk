import { useAuth } from '../../hooks/useAuth';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header style={{
      background: 'white',
      padding: '1rem 2rem',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>FeeDesk</h1>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span>Welcome, {user?.name}</span>
        <button onClick={logout} className="btn btn-primary">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;