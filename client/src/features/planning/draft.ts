import type { Snapshot } from '../../shared/api/types';

export type PlanDraft =
  | { kind: 'saved' }
  | { kind: 'draft'; meals: Snapshot[]; baseVersion: string | null };

/**
 * Replaces draft meals, retaining the version captured when drafting began.
 * For a new draft, captures `savedVersion`, or null if no saved version exists.
 * The supplied meals array is retained without cloning.
 */
export function beginDraft(
  current: PlanDraft,
  meals: Snapshot[],
  savedVersion: string | undefined,
): PlanDraft {
  return current.kind === 'draft'
    ? { ...current, meals }
    : { kind: 'draft', meals, baseVersion: savedVersion ?? null };
}
