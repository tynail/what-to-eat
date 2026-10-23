import { ingredientUnits, type Ingredient, type MealInput, type RecipeInput } from "../../api";

export const units = ingredientUnits;

export function blankIngredient(): Ingredient { return { name: "", quantity: 1, unit: "count", note: "" }; }
/** Returns a new recipe draft for two servings with one blank ingredient and one blank step. */
export function blankRecipe(): RecipeInput { return { name: "", description: "", servings: 2, steps: [""], ingredients: [blankIngredient()] }; }
/** Returns a new meal draft with no selected recipes or record identity. */
export function blankMeal(): MealInput { return { name: "", description: "", recipes: [] }; }
