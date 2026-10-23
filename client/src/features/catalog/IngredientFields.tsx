import { Plus } from 'lucide-react';
import type { Ingredient, RecipeInput } from '../../api';
import { blankIngredient, units } from './factories';

export function IngredientFields({
  recipe,
  update,
}: {
  recipe: RecipeInput;
  update: (recipe: RecipeInput) => void;
}) {
  /** Patches the ingredient at a zero-based index; an unmatched index leaves all rows unchanged. */
  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    update({
      ...recipe,
      ingredients: recipe.ingredients.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  return (
    <>
      <h3 className="m-[0_0_12px] text-[17px]">Ingredients</h3>
      {recipe.ingredients.map((ingredient, index) => (
        <div
          className="ingredient-row [&&]:grid [&&]:grid-cols-[2fr_0.8fr_1fr_1.6fr_auto] [&&]:gap-[8px] [&&]:items-center [&&_label]:text-[10px] [&&_button]:p-[7px] [@media(max-width:760px)]:[&&]:grid-cols-[2fr_1fr_1fr] [@media(max-width:760px)]:[&&_label:nth-child(4)]:[grid-column:1/3]"
          key={index}
        >
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            Ingredient {index + 1}
            <input
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
              required
              maxLength={120}
              value={ingredient.name}
              onChange={(event) =>
                updateIngredient(index, { name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            Quantity
            <input
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
              type="number"
              required={ingredient.unit !== 'unspecified'}
              min="0.0001"
              max="1000000"
              step="any"
              value={ingredient.quantity ?? ''}
              onChange={(event) =>
                updateIngredient(index, {
                  quantity:
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            Unit
            <select
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
              value={ingredient.unit}
              onChange={(event) => {
                const unit = units.find(
                  (candidate) => candidate === event.target.value,
                );
                if (unit) updateIngredient(index, { unit });
              }}
            >
              {units.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            Note
            <input
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
              maxLength={500}
              value={ingredient.note}
              onChange={(event) =>
                updateIngredient(index, { note: event.target.value })
              }
            />
          </label>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            type="button"
            aria-label={`Remove ingredient ${index + 1}`}
            disabled={recipe.ingredients.length === 1}
            onClick={() =>
              update({
                ...recipe,
                ingredients: recipe.ingredients.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              })
            }
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
        type="button"
        onClick={() =>
          update({
            ...recipe,
            ingredients: [...recipe.ingredients, blankIngredient()],
          })
        }
      >
        <Plus size={16} /> Add ingredient
      </button>
    </>
  );
}
