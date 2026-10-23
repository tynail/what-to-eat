import { useQuery } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { apiParsed, parseMe } from '../api';
import { Settings } from '../features/settings/Settings';
import { Login } from '../features/access/Login';
import { Catalog } from '../features/catalog/Catalog';
import { Planner } from '../features/planning/Planner';

/**
 * Shows account redemption at `/join`; elsewhere waits for the current-user query
 * and renders sign-in when no user is available, or the household routes otherwise.
 */
export function App() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => apiParsed('/auth/me', parseMe),
  });
  if (location.pathname === '/join') return <Login join />;
  if (me.isPending)
    return (
      <p
        className="m-[0_0_12px] loading [&&]:text-center [&&]:m-[20vh_auto]"
        role="status"
      >
        Opening your kitchen…
      </p>
    );
  if (!me.data) return <Login />;
  return (
    <div className="shell [&&]:grid [&&]:grid-cols-[254px_1fr] [&&]:min-h-screen [@media(max-width:1100px)]:[&&]:grid-cols-[210px_1fr] [@media(max-width:760px)]:[&&]:block">
      <Sidebar me={me.data} />
      <main className="w-full max-w-[1240px] p-[46px_56px] m-[auto] [@media(min-width:1450px)]:pt-[55px] [@media(max-width:1100px)]:p-[34px_28px] [@media(max-width:760px)]:p-[27px_19px]">
        <Routes>
          <Route path="/" element={<Planner />} />
          <Route path="/recipes" element={<Catalog kind="recipes" />} />
          <Route path="/meals" element={<Catalog kind="meals" />} />
          <Route path="/settings" element={<Settings me={me.data} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <footer className="text-[10px] text-[#9aa18f] text-center m-[48px_0_0]">
          Made for your household. Shared around your table.
        </footer>
      </main>
    </div>
  );
}

/** Provides browser-history routing for the application. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
