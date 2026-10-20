import type { Ingredient, Meal, Recipe } from "../../api";

export const units = ["count", "g", "kg", "oz", "lb", "ml", "l", "tsp", "tbsp", "cup", "unspecified"] as const;

export function blankIngredient(): Ingredient { return { name: "", quantity: 1, unit: "count", note: "" }; }
export function blankRecipe(): Recipe { return { id: 0, version: "", name: "", description: "", servings: 2, steps: [""], ingredients: [blankIngredient()] }; }
export function blankMeal(): Meal { return { id: 0, version: "", name: "", description: "", recipes: [] }; }
