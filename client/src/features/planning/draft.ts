import type { Snapshot } from '../../shared/api/types';

export type PlanDraft =
  | { kind: 'saved' }
  | { kind: 'draft'; meals: Snapshot[]; baseVersion: string | null };

export function beginDraft(
  current: PlanDraft,
  meals: Snapshot[],
  savedVersion: string | undefined,
): PlanDraft {
  return current.kind === 'draft'
    ? { ...current, meals }
    : { kind: 'draft', meals, baseVersion: savedVersion ?? null };
}
