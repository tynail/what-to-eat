import { useState } from "react";
import { Plus } from "lucide-react";
import { type Ingredient, type Meal, type MealInput, type Recipe, type RecipeInput } from "../../api";
import { blankIngredient, units } from "./factories";
import { useAction } from "../../shared/ui/action";
import { ErrorBox } from "../../shared/ui/page";
import { Modal } from "../../shared/ui/Modal";

export type EditorState =
  | { kind: "recipe"; mode: "new"; value: RecipeInput }
  | { kind: "recipe"; mode: "saved"; id: number; version: string; value: RecipeInput }
  | { kind: "meal"; mode: "new"; value: MealInput }
  | { kind: "meal"; mode: "saved"; id: number; version: string; value: MealInput };

function isRecipe(value: Recipe | Meal): value is Recipe {
  return "ingredients" in value;
}

/**
 * Builds saved editor state with identity and version separate from the input payload,
 * omitting recipe names from meal references. Recipe ingredient and step arrays are
 * shared with the input record; callers needing an independent copy must clone it first.
 */
export function editRecord(item: Recipe | Meal): EditorState {
  if (isRecipe(item)) {
    const { id, version, ...value } = item;
    return { kind: "recipe", mode: "saved", id, version, value };
  }

  const { id, version, ...meal } = item;
  return {
    kind: "meal",
    mode: "saved",
    id,
    version,
    value: {
      ...meal,
      recipes: meal.recipes.map(({ recipeId, servings }) => ({ recipeId, servings })),
    },
  };
}

/**
 * Edits a recipe or meal in a modal, displaying save failures and disabling fields
 * while saving. A meal with no selected recipes has its save button disabled.
 *
 * `initial` is captured on mount; later prop changes do not reset the draft.
 * `recipes` supplies the meal choices. `save` receives the current editor state;
 * rejections are caught and displayed. `close` handles dismissal and is not
 * automatically called after a successful save.
 */
export function CatalogEditor({ initial, recipes, save, close }: {
  initial: EditorState;
  recipes: Recipe[];
  save: (editor: EditorState) => Promise<void>;
  close: () => void;
}) {
  const [value, setValue] = useState(initial);
  const action = useAction();

  function updateRecipe(recipe: RecipeInput) {
    setValue(current => current.kind === "recipe"
      ? { ...current, value: recipe }
      : current);
  }

  function updateMeal(meal: MealInput) {
    setValue(current => current.kind === "meal"
      ? { ...current, value: meal }
      : current);
  }

  return (
    <Modal title={`${value.mode === "saved" ? "Edit" : "New"} ${value.kind}`} close={close}>
      <form onSubmit={event => {
        event.preventDefault();
        void action.run(() => save(value));
      }}>
        <fieldset disabled={action.busy}>
          <label>
            Name
            <input required maxLength={120} value={value.value.name}
              onChange={event => {
                const name = event.target.value;
                setValue(current => current.kind === "recipe"
                  ? { ...current, value: { ...current.value, name } }
                  : { ...current, value: { ...current.value, name } });
              }} />
          </label>
          <label>
            Description
            <textarea maxLength={4000} value={value.value.description}
              onChange={event => {
                const description = event.target.value;
                setValue(current => current.kind === "recipe"
                  ? { ...current, value: { ...current.value, description } }
                  : { ...current, value: { ...current.value, description } });
              }} />
          </label>
          {value.kind === "recipe"
            ? <RecipeFields recipe={value.value} update={updateRecipe} />
            : <MealFields meal={value.value} recipes={recipes} update={updateMeal} />}
          <ErrorBox error={action.error} />
          <div className="form-actions">
            <button type="button" onClick={close}>Cancel</button>
            <button className="primary" disabled={value.kind === "meal" && value.value.recipes.length === 0}>
              {action.busy ? "Saving…" : `Save ${value.kind}`}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

/**
 * Renders recipe inputs and reports replacement recipe values through `update`.
 * An unspecified unit permits a blank quantity, stored as null. Removal buttons
 * preserve the last ingredient and step; cooking steps can be moved up one position.
 */
function RecipeFields({ recipe, update }: { recipe: RecipeInput; update: (recipe: RecipeInput) => void }) {
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
      <label>
        Base servings
        <input type="number" required min="0.01" max="1000" step="any" value={recipe.servings}
          onChange={event => update({ ...recipe, servings: Number(event.target.value) })} />
      </label>
      <h3>Ingredients</h3>
      {recipe.ingredients.map((ingredient, index) => (
        <div className="ingredient-row" key={index}>
          <label>
            Ingredient {index + 1}
            <input required maxLength={120} value={ingredient.name}
              onChange={event => updateIngredient(index, { name: event.target.value })} />
          </label>
          <label>
            Quantity
            <input type="number" required={ingredient.unit !== "unspecified"} min="0.0001" max="1000000" step="any"
              value={ingredient.quantity ?? ""}
              onChange={event => updateIngredient(index, {
                quantity: event.target.value === "" ? null : Number(event.target.value),
              })} />
          </label>
          <label>
            Unit
            <select value={ingredient.unit} onChange={event => {
              const unit = units.find(candidate => candidate === event.target.value);
              if (unit) updateIngredient(index, { unit });
            }}>
              {units.map(unit => <option key={unit}>{unit}</option>)}
            </select>
          </label>
          <label>
            Note
            <input maxLength={500} value={ingredient.note}
              onChange={event => updateIngredient(index, { note: event.target.value })} />
          </label>
          <button type="button" aria-label={`Remove ingredient ${index + 1}`}
            disabled={recipe.ingredients.length === 1}
            onClick={() => update({ ...recipe, ingredients: recipe.ingredients.filter((_, itemIndex) => itemIndex !== index) })}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => update({ ...recipe, ingredients: [...recipe.ingredients, blankIngredient()] })}>
        <Plus size={16} /> Add ingredient
      </button>
      <h3>Cooking steps</h3>
      {recipe.steps.map((step, index) => (
        <div className="step-row" key={index}>
          <label>
            Step {index + 1}
            <textarea required maxLength={4000} value={step}
              onChange={event => update({
                ...recipe,
                steps: recipe.steps.map((current, stepIndex) => stepIndex === index ? event.target.value : current),
              })} />
          </label>
          <button type="button" aria-label={`Move step ${index + 1} up`} disabled={index === 0}
            onClick={() => {
              const steps = [...recipe.steps];
              const current = steps[index];
              const previous = steps[index - 1];
              if (current === undefined || previous === undefined) return;
              steps[index - 1] = current;
              steps[index] = previous;
              update({ ...recipe, steps });
            }}>↑</button>
          <button type="button" aria-label={`Remove step ${index + 1}`} disabled={recipe.steps.length === 1}
            onClick={() => update({ ...recipe, steps: recipe.steps.filter((_, stepIndex) => stepIndex !== index) })}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => update({ ...recipe, steps: [...recipe.steps, ""] })}>
        <Plus size={16} /> Add step
      </button>
    </>
  );
}

/**
 * Renders recipe selection and target servings, reporting replacement meal values
 * through `update`. Newly selected recipes start with their base servings; the
 * target-servings inputs accept values from 0.01 through 1000, inclusive.
 */
function MealFields({ meal, recipes, update }: { meal: MealInput; recipes: Recipe[]; update: (meal: MealInput) => void }) {
  return (
    <>
      <h3>Recipes in this meal</h3>
      <p className="muted">Choose recipes, then set how many servings to cook.</p>
      {recipes.length === 0 && <p>Add a recipe in your recipe book first.</p>}
      {recipes.map(recipe => {
        const selected = meal.recipes.find(item => item.recipeId === recipe.id);
        return (
          <div className="recipe-choice" key={recipe.id}>
            <label className="check">
              <input type="checkbox" checked={selected !== undefined} onChange={event => update({
                ...meal,
                recipes: event.target.checked
                  ? [...meal.recipes, { recipeId: recipe.id, servings: recipe.servings }]
                  : meal.recipes.filter(item => item.recipeId !== recipe.id),
              })} />
              {recipe.name}
            </label>
            {selected && (
              <label>
                Target servings
                <input aria-label={`Servings for ${recipe.name}`} required type="number" min="0.01" max="1000" step="any"
                  value={selected.servings} onChange={event => update({
                    ...meal,
                    recipes: meal.recipes.map(item => item.recipeId === recipe.id
                      ? { ...item, servings: Number(event.target.value) }
                      : item),
                  })} />
              </label>
            )}
          </div>
        );
      })}
    </>
  );
}
