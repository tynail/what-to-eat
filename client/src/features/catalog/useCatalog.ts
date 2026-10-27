import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  apiParsed,
  parseMeals,
  parseRecipes,
  parseSnapshot,
  type Recipe,
  type Meal,
  type Snapshot,
} from '../../api';
import { useAction } from '../../shared/ui/action';
import { blankMeal, blankRecipe } from './factories';
import { editRecord, isRecipe, type EditorState } from './editorState';
import i18n from '../../i18n';

export type CatalogKind = 'recipes' | 'meals';

/** Owns collection commands and modal selection, leaving cached records in React Query. */
export function useCatalog(kind: CatalogKind) {
  const recipes = useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiParsed('/recipes', parseRecipes),
  });
  const meals = useQuery({
    queryKey: ['meals'],
    queryFn: () => apiParsed('/meals', parseMeals),
  });
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditorState | null>(null);
  const [view, setView] = useState<Snapshot | null>(null);
  const action = useAction();
  const result = kind === 'recipes' ? recipes : meals;

  /** Refreshes the changed collection and, for recipe changes, dependent meals. */
  async function invalidate(collection: CatalogKind) {
    await queryClient.invalidateQueries({ queryKey: [collection] });
    if (collection === 'recipes')
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
  }

  /**
   * Creates a record or updates it using its saved version, refreshes affected collections,
   * and closes the editor on success. Request errors propagate to the caller;
   * a failed request leaves the editor open.
   */
  async function save(editor: EditorState) {
    const collection = editor.kind === 'recipe' ? 'recipes' : 'meals';
    if (editor.mode === 'new') {
      await api(`/${collection}`, { method: 'POST', body: editor.value });
    } else {
      await api(`/${collection}/${editor.id}`, {
        method: 'PUT',
        body: { ...editor.value, version: editor.version },
      });
    }
    await invalidate(collection);
    setEditing(null);
  }

  /** Opens a blank editor for the active collection. */
  function create() {
    setEditing(
      kind === 'recipes'
        ? { kind: 'recipe', mode: 'new', value: blankRecipe() }
        : { kind: 'meal', mode: 'new', value: blankMeal() },
    );
  }

  /**
   * Opens a local recipe snapshot or fetches a meal snapshot for viewing.
   * Failures are caught and exposed through `error`.
   */
  function preview(item: Recipe | Meal) {
    return action.run(async () => {
      if (isRecipe(item)) {
        const { id, version, ...recipe } = item;
        setView({
          mealId: id,
          name: item.name,
          description: item.description,
          recipes: [{ ...recipe, recipeId: id }],
        });
      } else {
        setView(await apiParsed(`/meals/${item.id}/snapshot`, parseSnapshot));
      }
    });
  }

  /**
   * Confirms deletion, sends the record version, and refreshes affected collections.
   * Cancellation does nothing; action failures are caught and exposed through `error`.
   */
  function remove(item: Recipe | Meal) {
    if (!confirm(i18n.t('confirmDelete', { name: item.name }))) return;
    return action.run(async () => {
      await api(`/${kind}/${item.id}?version=${item.version}`, {
        method: 'DELETE',
      });
      await invalidate(kind);
    });
  }

  return {
    result,
    recipes: recipes.data ?? [],
    editing,
    view,
    error: action.error || result.error,
    create,
    save,
    preview,
    remove,
    edit: (item: Recipe | Meal) =>
      setEditing(editRecord(structuredClone(item))),
    closeEditor: () => setEditing(null),
    closeView: () => setView(null),
  };
}
