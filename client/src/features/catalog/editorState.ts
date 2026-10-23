import type { Meal, MealInput, Recipe, RecipeInput } from '../../api';

export type EditorState =
  | { kind: 'recipe'; mode: 'new'; value: RecipeInput }
  | {
      kind: 'recipe';
      mode: 'saved';
      id: number;
      version: string;
      value: RecipeInput;
    }
  | { kind: 'meal'; mode: 'new'; value: MealInput }
  | {
      kind: 'meal';
      mode: 'saved';
      id: number;
      version: string;
      value: MealInput;
    };

/** Distinguishes catalog recipes from meals by the presence of `ingredients`. */
export function isRecipe(value: Recipe | Meal): value is Recipe {
  return 'ingredients' in value;
}

/**
 * Builds saved editor state with identity and version separate from the input payload,
 * omitting recipe names from meal references. Recipe ingredient and step arrays are
 * shared with the input record; callers needing an independent copy must clone it first.
 */
export function editRecord(item: Recipe | Meal): EditorState {
  if (isRecipe(item)) {
    const { id, version, ...value } = item;
    return { kind: 'recipe', mode: 'saved', id, version, value };
  }

  const { id, version, ...meal } = item;
  return {
    kind: 'meal',
    mode: 'saved',
    id,
    version,
    value: {
      ...meal,
      recipes: meal.recipes.map(({ recipeId, servings }) => ({
        recipeId,
        servings,
      })),
    },
  };
}
