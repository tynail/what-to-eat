import { useRef, useState } from 'react';
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
  const epoch = useRef(0);
  const action = useAction();
  const saved = plans.data?.find((plan) => plan.week === week);
  const draft = draftState.kind === 'draft' ? draftState.meals : null;
  const selection = draft ?? saved?.meals ?? [];

  /** Replaces unsaved meals while retaining the version captured by the first draft change. */
  function change(items: Snapshot[]) {
    setDraftState((current) => beginDraft(current, items, saved?.version));
  }

  /** Returns to saved meals and prevents pending selection responses from applying. */
  function discard() {
    epoch.current += 1;
    setDraftState({ kind: 'saved' });
  }

  /**
   * Selects a nonempty week string, confirming before discarding an existing draft.
   * Accepted selections discard the draft even when the week string is unchanged.
   */
  function selectWeek(nextWeek: string) {
    if (nextWeek && (!draft || confirm('Discard unsaved selection?'))) {
      setWeek(nextWeek);
      discard();
    }
  }

  /**
   * Requests a draft using the current count and excluded meal IDs.
   * Ignores the result after a discard or accepted week selection; failures populate `error`.
   */
  function generate() {
    const requestEpoch = epoch.current;
    return action.run(
      async () => {
        const next = await apiParsed('/planner/generate', parseSnapshots, {
          method: 'POST',
          body: { count, excludedIds: excluded },
        });
        if (requestEpoch === epoch.current) change(next);
      },
      () => requestEpoch === epoch.current,
    );
  }

  /**
   * Requests an alternative for `meal`, replacing the zero-based selection row `index`.
   * Sends selected and excluded IDs; ignores results after discard or week selection.
   * Failures are caught and exposed through `error`.
   */
  function reroll(index: number, meal: Snapshot) {
    const requestEpoch = epoch.current;
    return action.run(
      async () => {
        const next = await apiParsed('/planner/reroll', parseSnapshot, {
          method: 'POST',
          body: {
            selectedIds: selection.map((item) => item.mealId),
            excludedIds: excluded,
            replaceId: meal.mealId,
          },
        });
        if (requestEpoch !== epoch.current) return;
        change(
          selection.map((item, position) => (position === index ? next : item)),
        );
      },
      () => requestEpoch === epoch.current,
    );
  }

  /**
   * Fetches a snapshot for meal `id` and replaces the zero-based selection row `index`.
   * An empty ID does nothing; results after discard or week selection are ignored.
   * Failures are caught and exposed through `error`.
   */
  function replace(index: number, id: string) {
    if (!id) return;
    const requestEpoch = epoch.current;
    return action.run(
      async () => {
        const next = await apiParsed(`/meals/${id}/snapshot`, parseSnapshot);
        if (requestEpoch !== epoch.current) return;
        change(
          selection.map((item, position) => (position === index ? next : item)),
        );
      },
      () => requestEpoch === epoch.current,
    );
  }

  /**
   * Saves the draft with its captured base version, confirming before replacing a saved week.
   * Refreshes plans and discards on success; request failures retain the draft and populate `error`.
   * Does nothing when there is no draft or confirmation is declined.
   */
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

  /**
   * Confirms deletion of the saved plan using its version, then discards and refreshes plans.
   * Does nothing without a saved plan or confirmation; action failures populate `error`.
   */
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
