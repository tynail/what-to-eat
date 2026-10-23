import { ArrowRight, CalendarDays } from 'lucide-react';
import type { Plan } from '../../api';
import { pretty } from './dates';

export function PlanHistory({
  plans,
  onSelect,
}: {
  plans: Plan[];
  onSelect: (week: string) => void;
}) {
  return (
    <section className="past-weeks">
      <h2>Previously at your table</h2>
      {plans?.length ? (
        <div className="history-list">
          {plans.map((p) => (
            <button key={p.id} onClick={() => onSelect(p.week)}>
              <CalendarDays size={18} />
              <span>{pretty(p.week)}</span>
              <small>{p.meals.length} meals</small>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Saved weeks will find a home here.</p>
      )}
    </section>
  );
}
