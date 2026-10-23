import { Shuffle } from 'lucide-react';
import type { Meal, Snapshot } from '../../api';

export function WeeklyLineup({
  selection,
  meals,
  excluded,
  busy,
  onView,
  onReroll,
  onReplace,
}: {
  selection: Snapshot[];
  meals: Meal[];
  excluded: number[];
  busy: boolean;
  onView: (meal: Snapshot) => void;
  onReroll: (index: number, meal: Snapshot) => void;
  onReplace: (index: number, id: string) => void;
}) {
  return (
    <div className="lineup">
      {selection.map((m, i) => (
        <article className="meal-row" key={`${m.mealId}-${i}`}>
          <span className="meal-number">{String(i + 1).padStart(2, '0')}</span>
          <div className="meal-copy">
            <h3>{m.name}</h3>
            <p className="muted">{m.recipes.map((r) => r.name).join(' + ')}</p>
          </div>
          <button onClick={() => onView(m)}>Cook this</button>
          <button
            aria-label={`Reroll ${m.name}`}
            disabled={busy}
            onClick={() => onReroll(i, m)}
          >
            <Shuffle size={16} />
          </button>
          <select
            aria-label={`Replace ${m.name}`}
            value=""
            disabled={busy}
            onChange={(e) => onReplace(i, e.target.value)}
          >
            <option value="">Replace…</option>
            {meals
              ?.filter(
                (x) =>
                  !selection.some((s) => s.mealId === x.id) &&
                  !excluded.includes(x.id),
              )
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </article>
      ))}
    </div>
  );
}
