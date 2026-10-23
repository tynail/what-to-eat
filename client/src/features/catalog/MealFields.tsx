import type { MealInput, Recipe } from '../../api';

/**
 * Renders recipe selection and target servings, reporting replacement meal values
 * through `update`. Newly selected recipes start with their base servings; the
 * target-servings inputs accept values from 0.01 through 1000, inclusive.
 */
export function MealFields({
  meal,
  recipes,
  update,
}: {
  meal: MealInput;
  recipes: Recipe[];
  update: (meal: MealInput) => void;
}) {
  return (
    <>
      <h3>Recipes in this meal</h3>
      <p className="muted">
        Choose recipes, then set how many servings to cook.
      </p>
      {recipes.length === 0 && <p>Add a recipe in your recipe book first.</p>}
      {recipes.map((recipe) => {
        const selected = meal.recipes.find(
          (item) => item.recipeId === recipe.id,
        );
        return (
          <div className="recipe-choice" key={recipe.id}>
            <label className="check">
              <input
                type="checkbox"
                checked={selected !== undefined}
                onChange={(event) =>
                  update({
                    ...meal,
                    recipes: event.target.checked
                      ? [
                          ...meal.recipes,
                          { recipeId: recipe.id, servings: recipe.servings },
                        ]
                      : meal.recipes.filter(
                          (item) => item.recipeId !== recipe.id,
                        ),
                  })
                }
              />
              {recipe.name}
            </label>
            {selected && (
              <label>
                Target servings
                <input
                  aria-label={`Servings for ${recipe.name}`}
                  required
                  type="number"
                  min="0.01"
                  max="1000"
                  step="any"
                  value={selected.servings}
                  onChange={(event) =>
                    update({
                      ...meal,
                      recipes: meal.recipes.map((item) =>
                        item.recipeId === recipe.id
                          ? { ...item, servings: Number(event.target.value) }
                          : item,
                      ),
                    })
                  }
                />
              </label>
            )}
          </div>
        );
      })}
    </>
  );
}
