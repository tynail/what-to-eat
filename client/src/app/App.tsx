import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, NavLink, Routes, Route, Navigate } from "react-router-dom";
import { Leaf, CalendarDays, BookOpen, Utensils, Settings as SettingsIcon } from "lucide-react";
import { apiParsed, parseMe } from "../api";
import { Settings } from "../features/settings/Settings";
import { Login } from "../features/access/Login";
import { Catalog } from "../features/catalog/Catalog";
import { Planner } from "../features/planning/Planner";

export function App() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiParsed("/auth/me", parseMe) });
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

export function AppRouter() {
  return <BrowserRouter><App /></BrowserRouter>;
}
