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

  async function invalidate(collection: CatalogKind) {
    await queryClient.invalidateQueries({ queryKey: [collection] });
    if (collection === 'recipes')
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
  }

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

  function create() {
    setEditing(
      kind === 'recipes'
        ? { kind: 'recipe', mode: 'new', value: blankRecipe() }
        : { kind: 'meal', mode: 'new', value: blankMeal() },
    );
  }

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

  function remove(item: Recipe | Meal) {
    if (!confirm(`Delete “${item.name}”? Saved weeks will keep their copy.`))
      return;
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
