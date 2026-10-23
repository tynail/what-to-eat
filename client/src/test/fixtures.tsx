import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { resetCsrf, type Meal, type Recipe, type Snapshot } from '../api';

export const recipe: Recipe = {
  id: 11,
  version: 'recipe-v1',
  name: 'Pasta',
  description: 'Dinner',
  servings: 2,
  ingredients: [{ name: 'Pasta', quantity: 100, unit: 'g', note: '' }],
  steps: ['Boil water', 'Cook pasta'],
};
export const meal: Meal = {
  id: 1,
  version: 'meal-v1',
  name: 'Pasta night',
  description: '',
  recipes: [{ recipeId: recipe.id, name: recipe.name, servings: 4 }],
};
export const snapshot: Snapshot = {
  mealId: meal.id,
  name: meal.name,
  description: '',
  recipes: [
    {
      recipeId: recipe.id,
      name: recipe.name,
      description: recipe.description,
      servings: 4,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
    },
  ],
};

export function queryHarness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }
  return { client, wrapper };
}

/** Stub only HTTP, exercising the real request, CSRF, and response parsing code. */
export function network(
  respond: (path: string, init?: RequestInit) => Response,
) {
  resetCsrf();
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === '/api/auth/csrf')
      return Response.json({ token: 'test-token' });
    return respond(path, init);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
