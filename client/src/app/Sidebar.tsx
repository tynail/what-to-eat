import { NavLink } from 'react-router-dom';
import {
  Leaf,
  CalendarDays,
  BookOpen,
  Utensils,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { Me } from '../api';

export function Sidebar({ me }: { me: Me }) {
  return (
    <aside>
      <a className="brand" href="/">
        <span className="brand-icon">
          <Leaf />
        </span>
        <span>
          Weekly Table<small>A little less “what’s for dinner?”</small>
        </span>
      </a>
      <p className="nav-label">YOUR KITCHEN</p>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>
          <CalendarDays />
          This Week
        </NavLink>
        <NavLink to="/meals">
          <Utensils />
          Meals
        </NavLink>
        <NavLink to="/recipes">
          <BookOpen />
          Recipes
        </NavLink>
        <NavLink to="/settings">
          <SettingsIcon />
          Settings
        </NavLink>
      </nav>
      <div className="sidebar-note">
        <Leaf />
        <p>
          Good food.
          <br />
          One less decision.
        </p>
        <small>Make room for the meals you love.</small>
      </div>
      <div className="account">
        <span className="avatar">{me.username.slice(0, 1).toUpperCase()}</span>
        <div>
          {me.username}
          <small>Our household</small>
        </div>
      </div>
    </aside>
  );
}
