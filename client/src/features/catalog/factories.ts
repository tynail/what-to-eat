import { ingredientUnits, type Ingredient, type MealInput, type RecipeInput } from "../../api";

export const units = ingredientUnits;

export function blankIngredient(): Ingredient { return { name: "", quantity: 1, unit: "count", note: "" }; }
export function blankRecipe(): RecipeInput { return { name: "", description: "", servings: 2, steps: [""], ingredients: [blankIngredient()] }; }
export function blankMeal(): MealInput { return { name: "", description: "", recipes: [] }; }
