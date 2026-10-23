import type { RecipeInput } from '../../api';
import { IngredientFields } from './IngredientFields';
import { CookingSteps } from './CookingSteps';

/**
 * Renders recipe inputs and reports replacement recipe values through `update`.
 * An unspecified unit permits a blank quantity, stored as null. Removal buttons
 * preserve the last ingredient and step; cooking steps can be moved up one position.
 */
export function RecipeFields({
  recipe,
  update,
}: {
  recipe: RecipeInput;
  update: (recipe: RecipeInput) => void;
}) {
  return (
    <>
      <label>
        Base servings
        <input
          type="number"
          required
          min="0.01"
          max="1000"
          step="any"
          value={recipe.servings}
          onChange={(event) =>
            update({ ...recipe, servings: Number(event.target.value) })
          }
        />
      </label>
      <IngredientFields recipe={recipe} update={update} />
      <CookingSteps recipe={recipe} update={update} />
    </>
  );
}
