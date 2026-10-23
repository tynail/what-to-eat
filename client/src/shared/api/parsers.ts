import {
  ingredientUnits,
  type HouseholdUser,
  type Ingredient,
  type IngredientUnit,
  type Meal,
  type MealRecipeSummary,
  type Me,
  type Plan,
  type Recipe,
  type Snapshot,
  type SnapshotRecipe,
} from './types';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown): JsonObject {
  if (isObject(value)) return value;
  throw new Error('object expected');
}

function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('string expected');
  return value;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('number expected');
  return value;
}

function integer(value: unknown): number {
  const result = number(value);
  if (!Number.isInteger(result)) throw new Error('integer expected');
  return result;
}

/**
 * Accepts only literal boolean values without coercion.
 * @throws {Error} If the value is not a boolean.
 */
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('boolean expected');
  return value;
}

function isIngredientUnit(value: string): value is IngredientUnit {
  return ingredientUnits.some((unit) => unit === value);
}

/**
 * Accepts an exact, case-sensitive member of `ingredientUnits`.
 * @throws {Error} If the value is not a string or is an unsupported unit.
 */
function ingredientUnit(value: unknown): IngredientUnit {
  const unit = string(value);
  if (!isIngredientUnit(unit)) throw new Error('ingredient unit expected');
  return unit;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('array expected');
  return value;
}

/**
 * Parses an ingredient with a supported unit and a finite or null quantity.
 * Quantity may be null for any unit; positivity and nonempty names are not checked.
 * @throws {Error} If the object or any required field fails validation.
 */
function ingredient(value: unknown): Ingredient {
  const row = object(value);
  return {
    name: string(row.name),
    quantity: row.quantity === null ? null : number(row.quantity),
    unit: ingredientUnit(row.unit),
    note: string(row.note),
  };
}

function recipe(value: unknown): Recipe {
  const row = object(value);
  return {
    id: integer(row.id),
    version: string(row.version),
    name: string(row.name),
    description: string(row.description),
    servings: number(row.servings),
    steps: array(row.steps).map(string),
    ingredients: array(row.ingredients).map(ingredient),
  };
}

/**
 * Parses a meal's recipe reference, requiring an integer ID, finite servings,
 * and a string name (which may be empty).
 * @throws {Error} If the object or any required field fails validation.
 */
function mealRecipe(value: unknown): MealRecipeSummary {
  const row = object(value);
  return {
    recipeId: integer(row.recipeId),
    servings: number(row.servings),
    name: string(row.name),
  };
}

function meal(value: unknown): Meal {
  const row = object(value);
  return {
    id: integer(row.id),
    version: string(row.version),
    name: string(row.name),
    description: string(row.description),
    recipes: array(row.recipes).map(mealRecipe),
  };
}

function snapshotRecipe(value: unknown): SnapshotRecipe {
  const row = object(value);
  return {
    recipeId: integer(row.recipeId),
    name: string(row.name),
    description: string(row.description),
    servings: number(row.servings),
    steps: array(row.steps).map(string),
    ingredients: array(row.ingredients).map(ingredient),
  };
}

function snapshot(value: unknown): Snapshot {
  const row = object(value);
  return {
    mealId: integer(row.mealId),
    name: string(row.name),
    description: string(row.description),
    recipes: array(row.recipes).map(snapshotRecipe),
  };
}

function plan(value: unknown): Plan {
  const row = object(value);
  return {
    id: integer(row.id),
    week: string(row.week),
    version: string(row.version),
    meals: array(row.meals).map(snapshot),
  };
}

/**
 * Parses a household user, requiring a boolean `disabled` field without coercion.
 * @throws {Error} If the object or any required field fails validation.
 */
function householdUser(value: unknown): HouseholdUser {
  const row = object(value);
  return {
    id: string(row.id),
    username: string(row.username),
    disabled: boolean(row.disabled),
  };
}

/**
 * Parses the current user's identity, requiring a boolean `isAdmin` without coercion.
 * @throws {Error} If the object or any required field fails validation.
 */
export const parseMe = (value: unknown): Me => {
  const row = object(value);
  return {
    id: string(row.id),
    username: string(row.username),
    isAdmin: boolean(row.isAdmin),
  };
};
export const parseRecipes = (value: unknown): Recipe[] =>
  array(value).map(recipe);
export const parseMeals = (value: unknown): Meal[] => array(value).map(meal);
export const parseSnapshots = (value: unknown): Snapshot[] =>
  array(value).map(snapshot);
export const parseSnapshot = snapshot;
export const parsePlans = (value: unknown): Plan[] => array(value).map(plan);
export const parseHouseholdUsers = (value: unknown): HouseholdUser[] =>
  array(value).map(householdUser);
export const parseLinkResponse = (
  value: unknown,
): { path: string; expiresAt: string } => {
  const row = object(value);
  return { path: string(row.path), expiresAt: string(row.expiresAt) };
};
