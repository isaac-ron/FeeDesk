import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import api from '../services/api';

// Holds the active term + the full term list for the current school.
// Consumers: Sidebar (label), Overview metric cards, SMS filters, Fee
// Structures term list, Student Ledger term tabs.
//
// Until the backend /api/terms endpoint is wired up (see BACKEND_MIGRATION_NOTES.md)
// this falls back to a synthetic "active term" so the shell still renders.
export const TermContext = createContext({
  activeTerm: null,
  terms: [],
  loading: false,
  refresh: () => {},
  setActiveTerm: () => {},
});

const FALLBACK_TERM = {
  _id: 'fallback',
  name: 'Term 1 2026',
  academicYear: '2026',
  termNumber: 1,
  status: 'ACTIVE',
  startDate: '2026-01-06',
  endDate: '2026-04-10',
};

export const TermProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [terms, setTerms] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.role === 'super_admin') return;
    try {
      setLoading(true);
      const { data } = await api.get('/terms');
      const list = data?.data || [];
      setTerms(list);
      const active = list.find(t => t.status === 'ACTIVE') || list[0] || FALLBACK_TERM;
      setActiveTerm(active);
    } catch {
      // Endpoint not built yet — fall back so the shell still renders.
      setTerms([FALLBACK_TERM]);
      setActiveTerm(FALLBACK_TERM);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <TermContext.Provider value={{ activeTerm, terms, loading, refresh, setActiveTerm }}>
      {children}
    </TermContext.Provider>
  );
};

export const useActiveTerm = () => useContext(TermContext);
