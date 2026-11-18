import { useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  api,
  apiParsed,
  parseMeals,
  ApiError,
  parsePlan,
  parsePlanPage,
  parseSnapshot,
  parseSnapshots,
  type Snapshot,
} from '../../api';
import { useAction } from '../../shared/ui/action';
import { beginDraft, type PlanDraft } from './draft';
import { monday } from './dates';
import i18n from '../../i18n';

/** Server data stays in React Query; this hook owns only the current unsaved selection. */
export function usePlanner() {
  const meals = useQuery({
    queryKey: ['meals'],
    queryFn: () => apiParsed('/meals', parseMeals),
  });
  const [week, setWeek] = useState(monday());
  const history = useInfiniteQuery({
    queryKey: ['plan-history'],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      apiParsed(
        pageParam ? `/plans?before=${pageParam}` : '/plans',
        parsePlanPage,
      ),
    getNextPageParam: (page) => page.nextBefore,
  });
  const detail = useQuery({
    queryKey: ['plan', week],
    queryFn: async () => {
      try {
        return await apiParsed(`/plans/${week}`, parsePlan);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  const queryClient = useQueryClient();
  const [count, setCount] = useState(5);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [draftState, setDraftState] = useState<PlanDraft>({ kind: 'saved' });
  const epoch = useRef(0);
  const action = useAction();
  const saved = detail.data;
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
    if (nextWeek && (!draft || confirm(i18n.t('confirmDiscard')))) {
      setWeek(nextWeek);
      discard();
    }
  }

  /**
   * Requests a draft using the current count and excluded meal IDs.
   * Ignores results after a newer request, discard, or accepted week selection; current failures populate `error`.
   */
  function generate() {
    const requestEpoch = ++epoch.current;
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
   * Sends selected and excluded IDs; ignores results after a newer request, discard, or week selection.
   * Failures are caught and exposed through `error`.
   */
  function reroll(index: number, meal: Snapshot) {
    const requestEpoch = ++epoch.current;
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
   * An empty ID does nothing; results after a newer request, discard, or week selection are ignored.
   * Failures are caught and exposed through `error`.
   */
  function replace(index: number, id: string) {
    if (!id) return;
    const requestEpoch = ++epoch.current;
    return action.run(
      async () => {
        const next = await apiParsed(`/planner/preview/${id}`, parseSnapshot, {
          method: 'POST',
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
   * Saves the draft with its captured base version, confirming before replacing a saved week.
   * Refreshes plans and discards on success; request failures retain the draft and populate `error`.
   * Does nothing when there is no draft or confirmation is declined.
   */
  function save() {
    if (
      draftState.kind !== 'draft' ||
      (saved && !confirm(i18n.t('confirmReplace')))
    )
      return;
    return action.run(async () => {
      await api(`/plans/${week}`, {
        method: 'PUT',
        body: {
          references: draftState.meals.map(({ mealId, previewKey }) => ({
            mealId,
            previewKey,
          })),
          version: draftState.baseVersion,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plan', week] }),
        queryClient.invalidateQueries({ queryKey: ['plan-history'] }),
      ]);
      discard();
    });
  }

  /**
   * Confirms deletion of the saved plan using its version, then discards and refreshes plans.
   * Does nothing without a saved plan or confirmation; action failures populate `error`.
   */
  function deleteSaved() {
    if (!saved || !confirm(i18n.t('confirmDeleteWeek'))) return;
    return action.run(async () => {
      await api(`/plans/${saved.id}?version=${saved.version}`, {
        method: 'DELETE',
      });
      discard();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plan', week] }),
        queryClient.invalidateQueries({ queryKey: ['plan-history'] }),
      ]);
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
    plans: history.data?.pages.flatMap((page) => page.items) ?? [],
    hasMoreWeeks: history.hasNextPage,
    loadingHistory: history.isFetchingNextPage,
    loadMoreWeeks: history.fetchNextPage,
    busy: action.busy,
    generationDisabled:
      action.busy || meals.isPending || detail.isPending || !!detail.error,
    error: action.error || meals.error || detail.error || history.error,
    selectWeek,
    generate,
    reroll,
    replace,
    save,
    discard,
    deleteSaved,
  };
}
