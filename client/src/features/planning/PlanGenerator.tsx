import { Shuffle } from 'lucide-react';
import type { Meal } from '../../api';
import { ErrorBox } from '../../shared/ui/page';

export function PlanGenerator({
  week,
  count,
  meals,
  excluded,
  busy,
  disabled,
  error,
  onWeekChange,
  onCountChange,
  onExcludedChange,
  onGenerate,
}: {
  week: string;
  count: number;
  meals: Meal[];
  excluded: number[];
  busy: boolean;
  disabled: boolean;
  error: unknown;
  onWeekChange: (week: string) => void;
  onCountChange: (count: number) => void;
  onExcludedChange: (ids: number[]) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="panel generator">
      <div className="section-title">
        <span className="icon-box">
          <Shuffle />
        </span>
        <div>
          <h2>Let’s make a plan</h2>
          <p className="muted">
            A fresh selection. No repeats within your week.
          </p>
        </div>
      </div>
      <div className="generate-controls">
        <label>
          Week starting
          <input
            type="date"
            value={week}
            onChange={(e) => onWeekChange(e.target.value)}
          />
        </label>
        <label>
          Number of meals
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) => onCountChange(Number(e.target.value))}
          />
        </label>
        <button className="primary" disabled={disabled} onClick={onGenerate}>
          <Shuffle size={18} />
          {busy ? 'Working…' : 'Pick my meals'}
        </button>
      </div>
      <details className="exclusions">
        <summary>
          Leave something out{' '}
          <span className="muted">({excluded.length} excluded)</span>
        </summary>
        <div className="checks">
          {meals.map((m) => (
            <label className="check" key={m.id}>
              <input
                type="checkbox"
                checked={excluded.includes(m.id)}
                onChange={(e) =>
                  onExcludedChange(
                    e.target.checked
                      ? [...excluded, m.id]
                      : excluded.filter((id) => id !== m.id),
                  )
                }
              />
              {m.name}
            </label>
          ))}
        </div>
      </details>
      <ErrorBox error={error} />
    </section>
  );
}
