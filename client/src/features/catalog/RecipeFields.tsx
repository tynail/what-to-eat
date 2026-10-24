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
      <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
        Base servings
        <input
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
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
