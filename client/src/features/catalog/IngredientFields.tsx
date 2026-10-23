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
      <h3>Ingredients</h3>
      {recipe.ingredients.map((ingredient, index) => (
        <div className="ingredient-row" key={index}>
          <label>
            Ingredient {index + 1}
            <input
              required
              maxLength={120}
              value={ingredient.name}
              onChange={(event) =>
                updateIngredient(index, { name: event.target.value })
              }
            />
          </label>
          <label>
            Quantity
            <input
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
          <label>
            Unit
            <select
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
          <label>
            Note
            <input
              maxLength={500}
              value={ingredient.note}
              onChange={(event) =>
                updateIngredient(index, { note: event.target.value })
              }
            />
          </label>
          <button
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
