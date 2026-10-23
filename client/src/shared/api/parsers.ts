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

/** Checks for a non-null object that is not an array. */
function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns the original non-null, non-array object.
 * @throws {Error} If the value is not such an object.
 */
function object(value: unknown): JsonObject {
  if (isObject(value)) return value;
  throw new Error('object expected');
}

/**
 * Accepts strings, including empty strings, without coercion.
 * @throws {Error} If the value is not a string.
 */
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('string expected');
  return value;
}

/**
 * Accepts finite numbers without coercion or range restrictions.
 * @throws {Error} If the value is not a finite number.
 */
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('number expected');
  return value;
}

/**
 * Accepts finite integers, including zero and negative values.
 * @throws {Error} If the value is not a finite integer.
 */
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

/** Checks for an exact, case-sensitive member of `ingredientUnits`. */
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

/**
 * Returns the original array without validating its elements.
 * @throws {Error} If the value is not an array.
 */
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

/**
 * Parses a recipe with integer identity, finite servings, steps, and ingredients.
 * Does not require positive servings or nonempty strings or arrays.
 * @throws {Error} If a required field or nested value fails validation.
 */
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

/**
 * Parses a meal with versioned identity and recipe references; the recipe list may be empty.
 * @throws {Error} If a required field or nested value fails validation.
 */
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

/**
 * Parses recipe content identified by recipe ID without requiring a record version.
 * Servings need only be finite; strings and arrays may be empty.
 * @throws {Error} If a required field or nested value fails validation.
 */
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

/**
 * Parses a meal snapshot with embedded recipe content; the recipe list may be empty.
 * @throws {Error} If a required field or nested value fails validation.
 */
function snapshot(value: unknown): Snapshot {
  const row = object(value);
  return {
    mealId: integer(row.mealId),
    name: string(row.name),
    description: string(row.description),
    recipes: array(row.recipes).map(snapshotRecipe),
  };
}

/**
 * Parses a versioned plan with meal snapshots; `week` is checked only as a string.
 * @throws {Error} If a required field or nested value fails validation.
 */
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
/**
 * Parses an array of recipes, preserving order and allowing an empty array.
 * @throws {Error} If the input is not an array or any entry fails validation.
 */
export const parseRecipes = (value: unknown): Recipe[] =>
  array(value).map(recipe);
export const parseMeals = (value: unknown): Meal[] => array(value).map(meal);
/**
 * Parses an array of meal snapshots, preserving order and allowing an empty array.
 * @throws {Error} If the input is not an array or any entry fails validation.
 */
export const parseSnapshots = (value: unknown): Snapshot[] =>
  array(value).map(snapshot);
export const parseSnapshot = snapshot;
export const parsePlans = (value: unknown): Plan[] => array(value).map(plan);
/**
 * Parses an array of household users, preserving order and allowing an empty array.
 * @throws {Error} If the input is not an array or any entry fails validation.
 */
export const parseHouseholdUsers = (value: unknown): HouseholdUser[] =>
  array(value).map(householdUser);
/**
 * Parses an issued link's path and expiry as strings without validating URL or date syntax.
 * @throws {Error} If the input is not an object or either required field is not a string.
 */
export const parseLinkResponse = (
  value: unknown,
): { path: string; expiresAt: string } => {
  const row = object(value);
  return { path: string(row.path), expiresAt: string(row.expiresAt) };
};
