import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Leaf, Shuffle } from 'lucide-react';
import {
  api,
  apiParsed,
  parseMeals,
  parsePlans,
  parseSnapshot,
  parseSnapshots,
  type Snapshot,
} from '../../api';
import { useAction } from '../../shared/ui/action';
import { Empty, ErrorBox, Header } from '../../shared/ui/page';
import { CookingDetail } from '../../shared/cooking/CookingDetail';
import { monday, pretty } from './dates';
import { beginDraft, type PlanDraft } from './draft';

/**
 * Displays saved weekly plans and an unsaved selection that can be generated,
 * rerolled, or manually replaced. Saving persists the selected snapshots and
 * refreshes plan history; request failures are displayed on the page.
 */
export function Planner() {
  const meals = useQuery({
    queryKey: ['meals'],
    queryFn: () => apiParsed('/meals', parseMeals),
  });
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiParsed('/plans', parsePlans),
  });
  const qc = useQueryClient();
  const [week, setWeek] = useState(monday());
  const [count, setCount] = useState(5);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [draftState, setDraftState] = useState<PlanDraft>({ kind: 'saved' });
  const [view, setView] = useState<Snapshot | null>(null);
  const action = useAction();
  const saved = plans.data?.find((p) => p.week === week);
  const draft = draftState.kind === 'draft' ? draftState.meals : null;
  const baseVersion =
    draftState.kind === 'draft' ? draftState.baseVersion : null;
  const selection = draft ?? saved?.meals ?? [];
  function change(items: Snapshot[]) {
    setDraftState((current) => beginDraft(current, items, saved?.version));
  }
  return (
    <>
      <Header
        eyebrow="A FRESH WEEK, A LITTLE LESS GUESSWORK"
        title="What’s on the table?"
        text="Your favorites, a little shuffle, and dinner is decided."
      />
      <section className="planner-hero">
        <div>
          <span className="pill">YOUR WEEK, SORTED</span>
          <h2>
            Good meals.
            <br />
            Less mental load.
          </h2>
          <p>
            Pick how many meals you need.
            <br />
            We’ll take care of the choosing.
          </p>
          <div className="hero-line">
            <Leaf size={18} />
            Made from your own recipe collection
          </div>
        </div>
        <div className="plate-art" aria-hidden="true">
          <div className="plate">
            <span>✦</span>
            <i />
            <b />
            <em />
          </div>
          <div className="art-caption">
            a little planning
            <br />
            <strong>a lot to look forward to</strong>
          </div>
        </div>
      </section>
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
              onChange={(e) => {
                if (
                  e.target.value &&
                  (!draft || confirm('Discard unsaved selection?'))
                ) {
                  setWeek(monday(new Date(`${e.target.value}T12:00:00`)));
                  setDraftState({ kind: 'saved' });
                }
              }}
            />
          </label>
          <label>
            Number of meals
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <button
            className="primary"
            disabled={
              action.busy || meals.isPending || plans.isPending || !!plans.error
            }
            onClick={() =>
              void action.run(async () =>
                change(
                  await apiParsed('/planner/generate', parseSnapshots, {
                    method: 'POST',
                    body: { count, excludedIds: excluded },
                  }),
                ),
              )
            }
          >
            <Shuffle size={18} />
            {action.busy ? 'Working…' : 'Pick my meals'}
          </button>
        </div>
        <details className="exclusions">
          <summary>
            Leave something out{' '}
            <span className="muted">({excluded.length} excluded)</span>
          </summary>
          <div className="checks">
            {meals.data?.map((m) => (
              <label className="check" key={m.id}>
                <input
                  type="checkbox"
                  checked={excluded.includes(m.id)}
                  onChange={(e) =>
                    setExcluded(
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
        <ErrorBox error={action.error || meals.error || plans.error} />
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">WEEK OF {pretty(week).toUpperCase()}</p>
          <h2>
            Your weekly lineup <span className="count">{selection.length}</span>
          </h2>
        </div>
        <span className="pill">
          {draft
            ? 'Unsaved preview'
            : saved
              ? 'Saved plan'
              : 'Ready when you are'}
        </span>
      </div>
      {!selection.length ? (
        <Empty
          title="A delicious week starts with a little shuffle"
          text={
            meals.data?.length
              ? 'Choose your meal count above, then hit Pick my meals.'
              : 'First, add recipes and build a few meals in your collection.'
          }
        />
      ) : (
        <div className="lineup">
          {selection.map((m, i) => (
            <article className="meal-row" key={`${m.mealId}-${i}`}>
              <span className="meal-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="meal-copy">
                <h3>{m.name}</h3>
                <p className="muted">
                  {m.recipes.map((r) => r.name).join(' + ')}
                </p>
              </div>
              <button onClick={() => setView(m)}>Cook this</button>
              <button
                aria-label={`Reroll ${m.name}`}
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const next = await apiParsed(
                      '/planner/reroll',
                      parseSnapshot,
                      {
                        method: 'POST',
                        body: {
                          selectedIds: selection.map((s) => s.mealId),
                          excludedIds: excluded,
                          replaceId: m.mealId,
                        },
                      },
                    );
                    change(selection.map((s, n) => (n === i ? next : s)));
                  })
                }
              >
                <Shuffle size={16} />
              </button>
              <select
                aria-label={`Replace ${m.name}`}
                value=""
                disabled={action.busy}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id)
                    void action.run(async () => {
                      const next = await apiParsed(
                        `/meals/${id}/snapshot`,
                        parseSnapshot,
                      );
                      change(selection.map((s, n) => (n === i ? next : s)));
                    });
                }}
              >
                <option value="">Replace…</option>
                {meals.data
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
      )}
      {draft && (
        <div className="save-bar">
          <p>Looking good? Keep this week’s recipes exactly as they are.</p>
          <button
            className="primary"
            disabled={action.busy}
            onClick={() => {
              if (!saved || confirm('Replace this week’s saved plan?'))
                void action.run(async () => {
                  await api(`/plans/${week}`, {
                    method: 'PUT',
                    body: {
                      meals: draft,
                      version: baseVersion,
                    },
                  });
                  await qc.invalidateQueries({ queryKey: ['plans'] });
                  setDraftState({ kind: 'saved' });
                });
            }}
          >
            Save week <ArrowRight size={16} />
          </button>
          <button onClick={() => setDraftState({ kind: 'saved' })}>
            Discard preview
          </button>
        </div>
      )}
      {saved && (
        <button
          className="text-button danger"
          disabled={action.busy}
          onClick={() => {
            if (confirm('Delete this saved week?'))
              void action.run(async () => {
                await api(`/plans/${saved.id}?version=${saved.version}`, {
                  method: 'DELETE',
                });
                setDraftState({ kind: 'saved' });
                await qc.invalidateQueries({ queryKey: ['plans'] });
              });
          }}
        >
          Delete saved week
        </button>
      )}
      <section className="past-weeks">
        <h2>Previously at your table</h2>
        {plans.data?.length ? (
          <div className="history-list">
            {plans.data.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (!draft || confirm('Discard unsaved selection?')) {
                    setWeek(p.week);
                    setDraftState({ kind: 'saved' });
                  }
                }}
              >
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
      {view && <CookingDetail meal={view} close={() => setView(null)} />}
    </>
  );
}
