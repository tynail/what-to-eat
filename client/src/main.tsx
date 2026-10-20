import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Leaf, CalendarDays, BookOpen, Utensils, Settings as SettingsIcon } from "lucide-react";
import { api, type Me } from "./api";
import "./style.css";
import { Settings } from "./features/settings/Settings";
import { Login } from "./features/access/Login";
import { Catalog } from "./features/catalog/Catalog";
import { Planner } from "./features/planning/Planner";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

if (location.pathname === "/join") history.replaceState(null, "", location.pathname);

function App() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me") });
  if (location.pathname === "/join") return <Login join />;
  if (me.isPending)
    return <p className="loading" role="status">Opening your kitchen…</p>;
  if (!me.data) return <Login />;
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span className="brand-icon"><Leaf /></span>
          <span>Weekly Table<small>A little less “what’s for dinner?”</small></span>
        </a>
        <p className="nav-label">YOUR KITCHEN</p>
        <nav aria-label="Main navigation">
          <NavLink to="/" end><CalendarDays />This Week</NavLink>
          <NavLink to="/meals"><Utensils />Meals</NavLink>
          <NavLink to="/recipes"><BookOpen />Recipes</NavLink>
          <NavLink to="/settings"><SettingsIcon />Settings</NavLink>
        </nav>
        <div className="sidebar-note">
          <Leaf />
          <p>Good food.<br />One less decision.</p>
          <small>Make room for the meals you love.</small>
        </div>
        <div className="account">
          <span className="avatar">{me.data.username.slice(0, 1).toUpperCase()}</span>
          <div>{me.data.username}<small>Our household</small></div>
        </div>
      </aside>
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

