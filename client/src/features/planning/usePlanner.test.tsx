import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { meal, network, queryHarness, snapshot } from '../../test/fixtures';
import { monday } from './dates';
import { usePlanner } from './usePlanner';

function setup() {
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = monday(nextWeekDate);
  const harness = queryHarness();
  harness.client.setQueryData(['meals'], [meal]);
  harness.client.setQueryData(
    ['plans'],
    [{ id: 2, week: monday(), version: 'plan-v1', meals: [snapshot] }],
  );
  return {
    nextWeek,
    ...harness,
    ...renderHook(usePlanner, { wrapper: harness.wrapper }),
  };
}

describe('planner selection lifecycle', () => {
  describe.each(['generate', 'reroll', 'replace'] as const)(
    '%s responses',
    (operation) => {
      it.each(['discard', 'week change', 'week round trip'] as const)(
        'ignores a pending response after %s',
        async (transition) => {
          const fetch = network(() => Response.json([snapshot]));
          vi.stubGlobal(
            'confirm',
            vi.fn(() => true),
          );
          const { result, nextWeek } = setup();
          await act(async () => {
            await result.current.generate();
          });

          let respond!: (response: Response) => void;
          const response = new Promise<Response>((resolve) => {
            respond = resolve;
          });
          fetch.mockImplementationOnce(() => response);
          let request: Promise<void> | undefined;
          act(() => {
            request =
              operation === 'generate'
                ? result.current.generate()
                : operation === 'reroll'
                  ? result.current.reroll(0, snapshot)
                  : result.current.replace(0, '3');
          });
          expect(fetch).toHaveBeenCalledTimes(3);

          const originalWeek = result.current.week;
          act(() => {
            if (transition === 'discard') result.current.discard();
            else result.current.selectWeek(nextWeek);
          });
          if (transition === 'week round trip') {
            act(() => result.current.selectWeek(originalWeek));
          }
          expect(result.current.draft).toBeNull();

          const replacement = { ...snapshot, mealId: 3, name: 'Late dinner' };
          await act(async () => {
            respond(
              Response.json(
                operation === 'generate' ? [replacement] : replacement,
              ),
            );
            await request;
          });
          expect(result.current.draft).toBeNull();
          expect(result.current.selection).toEqual(
            transition === 'week change' ? [] : [snapshot],
          );
          expect(result.current.busy).toBe(false);
          expect(result.current.error).toBeFalsy();
        },
      );
    },
  );

  it('generates with count and exclusions without changing the saved plan', async () => {
    const fetch = network(() =>
      Response.json([{ ...snapshot, mealId: 3, name: 'New dinner' }]),
    );
    const { result, client } = setup();
    act(() => {
      result.current.setCount(2);
      result.current.setExcluded([1]);
    });
    await act(async () => {
      await result.current.generate();
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/planner/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ count: 2, excludedIds: [1] }),
      }),
    );
    expect(result.current.draft?.[0]?.name).toBe('New dinner');
    expect(client.getQueryData(['plans'])).toEqual([
      { id: 2, week: monday(), version: 'plan-v1', meals: [snapshot] },
    ]);
  });

  it('retains the original concurrency version through later changes and saves it', async () => {
    const fetch = network((path, init) => {
      if (path === '/api/planner/generate') return Response.json([snapshot]);
      if (path === '/api/planner/reroll')
        return Response.json({ ...snapshot, mealId: 3 });
      if (init?.method === 'PUT') return new Response(null, { status: 204 });
      return Response.json([
        { id: 2, week: monday(), version: 'plan-v3', meals: [snapshot] },
      ]);
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result, client } = setup();
    await act(async () => {
      await result.current.generate();
    });
    act(() => {
      client.setQueryData(
        ['plans'],
        [{ id: 2, week: monday(), version: 'plan-v2', meals: [snapshot] }],
      );
    });
    await waitFor(() => expect(result.current.saved?.version).toBe('plan-v2'));
    await act(async () => {
      await result.current.reroll(0, snapshot);
    });
    await act(async () => {
      await result.current.save();
    });
    const savedRequest = fetch.mock.calls.find(
      ([path, init]) =>
        path === `/api/plans/${monday()}` && init?.method === 'PUT',
    );
    const body = savedRequest?.[1]?.body;
    if (typeof body !== 'string') throw new Error('Expected JSON save body');
    const payload: unknown = JSON.parse(body);
    expect(payload).toEqual({
      meals: [{ ...snapshot, mealId: 3 }],
      version: 'plan-v1',
    });
    expect(result.current.draft).toBeNull();
  });

  it('replaces only the selected row and sends current IDs to reroll', async () => {
    const replacement = { ...snapshot, mealId: 3, name: 'Soup' };
    const fetch = network(() => Response.json(replacement));
    const { result, client } = setup();
    act(() =>
      client.setQueryData(
        ['plans'],
        [
          {
            id: 2,
            week: monday(),
            version: 'plan-v1',
            meals: [snapshot, { ...snapshot, mealId: 2 }],
          },
        ],
      ),
    );
    await waitFor(() => expect(result.current.selection).toHaveLength(2));
    await act(async () => {
      await result.current.replace(1, '3');
    });
    expect(result.current.selection).toEqual([snapshot, replacement]);
    await act(async () => {
      await result.current.reroll(0, snapshot);
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/planner/reroll',
      expect.objectContaining({
        body: JSON.stringify({
          selectedIds: [1, 3],
          excludedIds: [],
          replaceId: 1,
        }),
      }),
    );
  });

  it('retains unsaved selection and displays a failed save', async () => {
    network((path) =>
      path === '/api/planner/generate'
        ? Response.json([snapshot])
        : Response.json(
            { detail: 'Plan changed. Reload and retry.' },
            { status: 409 },
          ),
    );
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = setup();
    await act(async () => {
      await result.current.generate();
    });
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.draft).toEqual([snapshot]);
    expect(result.current.error).toBe('Plan changed. Reload and retry.');
    expect(result.current.busy).toBe(false);
  });

  it('honors discard confirmation when selecting history, then clears the preview', async () => {
    network(() => Response.json([snapshot]));
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const { result, nextWeek } = setup();
    await act(async () => {
      await result.current.generate();
    });
    act(() => result.current.selectWeek(nextWeek));
    expect(result.current.week).toBe(monday());
    expect(result.current.draft).toEqual([snapshot]);
    confirm.mockReturnValue(true);
    act(() => result.current.selectWeek(nextWeek));
    expect(result.current.week).toBe(nextWeek);
    expect(result.current.draft).toBeNull();
  });
});
