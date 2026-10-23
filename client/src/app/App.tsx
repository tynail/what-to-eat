import { useQuery } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { apiParsed, parseMe } from '../api';
import { Settings } from '../features/settings/Settings';
import { Login } from '../features/access/Login';
import { Catalog } from '../features/catalog/Catalog';
import { Planner } from '../features/planning/Planner';

export function App() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => apiParsed('/auth/me', parseMe),
  });
  if (location.pathname === '/join') return <Login join />;
  if (me.isPending)
    return (
      <p className="loading" role="status">
        Opening your kitchen…
      </p>
    );
  if (!me.data) return <Login />;
  return (
    <div className="shell">
      <Sidebar me={me.data} />
      <main>
        <Routes>
          <Route path="/" element={<Planner />} />
          <Route path="/recipes" element={<Catalog kind="recipes" />} />
          <Route path="/meals" element={<Catalog kind="meals" />} />
          <Route path="/settings" element={<Settings me={me.data} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <footer>Made for your household. Shared around your table.</footer>
      </main>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
