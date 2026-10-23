import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { meal, network, queryHarness, recipe } from '../../test/fixtures';
import { editRecord } from './editorState';
import { useCatalog, type CatalogKind } from './useCatalog';

function setup(kind: CatalogKind = 'recipes') {
  const harness = queryHarness();
  harness.client.setQueryData(['recipes'], [recipe]);
  harness.client.setQueryData(['meals'], [meal]);
  return {
    ...harness,
    ...renderHook(() => useCatalog(kind), { wrapper: harness.wrapper }),
  };
}

describe('collection commands', () => {
  it('clones editor data so unsaved ingredient changes cannot mutate cached recipes', () => {
    const { result, client } = setup();
    act(() => result.current.edit(recipe));
    const editor = result.current.editing;
    expect(editor?.mode).toBe('saved');
    if (editor?.kind !== 'recipe') throw new Error('Expected recipe editor');
    const ingredient = editor.value.ingredients[0];
    if (!ingredient) throw new Error('Expected ingredient');
    ingredient.name = 'Changed';
    expect(client.getQueryData(['recipes'])).toEqual([recipe]);
    expect(recipe.ingredients[0]?.name).toBe('Pasta');
  });

  it.each(['recipes', 'meals'] satisfies CatalogKind[])(
    'posts new %s to its plural collection URL',
    async (kind) => {
      const fetch = network((path) =>
        Response.json(path === '/api/recipes' ? [recipe] : [meal]),
      );
      const { result } = setup(kind);
      act(() => result.current.create());
      const editor = result.current.editing;
      if (!editor) throw new Error('Expected new editor');
      await act(async () => {
        await result.current.save(editor);
      });
      expect(fetch).toHaveBeenCalledWith(
        `/api/${kind}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(editor.value),
        }),
      );
      expect(result.current.editing).toBeNull();
    },
  );

  it('puts versioned edits and refreshes meals after a recipe update', async () => {
    const fetch = network((path) =>
      Response.json(path === '/api/recipes' ? [recipe] : [meal]),
    );
    const { result } = setup();
    const editor = editRecord(recipe);
    await act(async () => {
      await result.current.save(editor);
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/recipes/11',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ ...editor.value, version: recipe.version }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/meals',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('keeps editing state when save fails', async () => {
    network(() =>
      Response.json({ detail: 'Recipe changed.' }, { status: 409 }),
    );
    const { result } = setup();
    act(() => result.current.edit(recipe));
    const editor = result.current.editing;
    if (!editor) throw new Error('Expected editor');
    await act(async () => {
      await expect(result.current.save(editor)).rejects.toThrow(
        'Recipe changed.',
      );
    });
    expect(result.current.editing).toBe(editor);
  });

  it('includes the version when deleting, honoring cancellation', async () => {
    const fetch = network(() => Response.json([]));
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const { result } = setup('meals');
    await act(async () => {
      await result.current.remove(meal);
    });
    expect(fetch).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await act(async () => {
      await result.current.remove(meal);
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/meals/1?version=meal-v1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
