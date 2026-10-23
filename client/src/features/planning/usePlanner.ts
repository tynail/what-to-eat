import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { beginDraft, type PlanDraft } from './draft';
import { monday } from './dates';

/** Server data stays in React Query; this hook owns only the current unsaved selection. */
export function usePlanner() {
  const meals = useQuery({
    queryKey: ['meals'],
    queryFn: () => apiParsed('/meals', parseMeals),
  });
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiParsed('/plans', parsePlans),
  });
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(monday());
  const [count, setCount] = useState(5);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [draftState, setDraftState] = useState<PlanDraft>({ kind: 'saved' });
  const action = useAction();
  const saved = plans.data?.find((plan) => plan.week === week);
  const draft = draftState.kind === 'draft' ? draftState.meals : null;
  const selection = draft ?? saved?.meals ?? [];

  function change(items: Snapshot[]) {
    setDraftState((current) => beginDraft(current, items, saved?.version));
  }

  function discard() {
    setDraftState({ kind: 'saved' });
  }

  function selectWeek(nextWeek: string) {
    if (nextWeek && (!draft || confirm('Discard unsaved selection?'))) {
      setWeek(nextWeek);
      discard();
    }
  }

  function generate() {
    return action.run(async () =>
      change(
        await apiParsed('/planner/generate', parseSnapshots, {
          method: 'POST',
          body: { count, excludedIds: excluded },
        }),
      ),
    );
  }

  function reroll(index: number, meal: Snapshot) {
    return action.run(async () => {
      const next = await apiParsed('/planner/reroll', parseSnapshot, {
        method: 'POST',
        body: {
          selectedIds: selection.map((item) => item.mealId),
          excludedIds: excluded,
          replaceId: meal.mealId,
        },
      });
      change(
        selection.map((item, position) => (position === index ? next : item)),
      );
    });
  }

  function replace(index: number, id: string) {
    if (!id) return;
    return action.run(async () => {
      const next = await apiParsed(`/meals/${id}/snapshot`, parseSnapshot);
      change(
        selection.map((item, position) => (position === index ? next : item)),
      );
    });
  }

  function save() {
    if (
      draftState.kind !== 'draft' ||
      (saved && !confirm('Replace this week’s saved plan?'))
    )
      return;
    return action.run(async () => {
      await api(`/plans/${week}`, {
        method: 'PUT',
        body: { meals: draftState.meals, version: draftState.baseVersion },
      });
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      discard();
    });
  }

  function deleteSaved() {
    if (!saved || !confirm('Delete this saved week?')) return;
    return action.run(async () => {
      await api(`/plans/${saved.id}?version=${saved.version}`, {
        method: 'DELETE',
      });
      discard();
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
    });
  }

  return {
    week,
    count,
    setCount,
    excluded,
    setExcluded,
    draft,
    saved,
    selection,
    meals: meals.data ?? [],
    plans: plans.data ?? [],
    busy: action.busy,
    generationDisabled:
      action.busy || meals.isPending || plans.isPending || !!plans.error,
    error: action.error || meals.error || plans.error,
    selectWeek,
    generate,
    reroll,
    replace,
    save,
    discard,
    deleteSaved,
  };
}
