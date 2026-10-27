import type { Page, Request } from '@playwright/test';
import type {
  HouseholdUser,
  Meal,
  Me,
  Plan,
  Recipe,
  Snapshot,
} from '../src/api';

type Session = { user: Me | null };

export type ApiState = {
  admin: Me;
  guest: Me | null;
  users: HouseholdUser[];
  recipes: Recipe[];
  meals: Meal[];
  plans: Plan[];
  nextRecipeId: number;
  nextMealId: number;
  nextPlanId: number;
  invitePath: string;
};

function snapshotForMeal(meal: Meal, state: ApiState): Snapshot {
  return {
    mealId: meal.id,
    name: meal.name,
    description: meal.description,
    recipes: meal.recipes.map(({ recipeId }) => {
      const recipe = state.recipes.find((item) => item.id === recipeId);
      if (!recipe) throw new Error(`Missing recipe ${recipeId}`);
      const { id, version, ...snapshotRecipe } = recipe;
      return { ...snapshotRecipe, recipeId: id };
    }),
  };
}

function body<T>(request: Request): T {
  return request.postDataJSON() as T;
}

function jsonError(status: number, detail: string) {
  return { status, json: { detail } };
}

export function createApiState(): ApiState {
  const admin: Me = { id: 'admin', username: 'Alex', isAdmin: true };
  return {
    admin,
    guest: null,
    users: [
      { id: admin.id, username: admin.username, disabled: false },
      { id: 'member', username: 'Sam', disabled: false },
    ],
    recipes: [],
    meals: [],
    plans: [],
    nextRecipeId: 1,
    nextMealId: 1,
    nextPlanId: 1,
    invitePath: `/join#invite:${'A'.repeat(64)}`,
  };
}

export async function mockApi(
  page: Page,
  state: ApiState,
  session: Session,
): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, json: value });

    if (path === '/api/auth/me' && method === 'GET') {
      if (!session.user) return json({ detail: 'Please sign in.' }, 401);
      return json(session.user);
    }
    if (path === '/api/auth/csrf' && method === 'GET')
      return json({ token: 'test-csrf' });
    if (path === '/api/auth/login' && method === 'POST') {
      const input = await body<{ username: string }>(request);
      if (input.username === state.admin.username) session.user = state.admin;
      else if (state.guest?.username === input.username)
        session.user = state.guest;
      else
        return json({ detail: 'Invalid login or account unavailable.' }, 401);
      return json({});
    }
    if (path === '/api/auth/redeem' && method === 'POST') {
      const input = await body<{ username: string }>(request);
      state.guest = {
        id: 'guest',
        username: input.username,
        isAdmin: false,
      };
      return json({});
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      session.user = null;
      return route.fulfill({ status: 204, body: '' });
    }
    if (!session.user) return route.fulfill(jsonError(401, 'Please sign in.'));

    if (path === '/api/admin/users' && method === 'GET')
      return json(state.users);
    if (path === '/api/admin/invites' && method === 'POST')
      return json({
        path: state.invitePath,
        expiresAt: '2026-10-29T12:00:00Z',
      });

    if (path === '/api/recipes' && method === 'GET') return json(state.recipes);
    if (path === '/api/recipes' && method === 'POST') {
      const input = await body<Omit<Recipe, 'id' | 'version'>>(request);
      const recipe: Recipe = {
        ...input,
        id: state.nextRecipeId++,
        version: 'recipe-v1',
      };
      state.recipes.push(recipe);
      return json(recipe);
    }
    if (path.startsWith('/api/recipes/') && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const input = await body<Omit<Recipe, 'id' | 'version'>>(request);
      const index = state.recipes.findIndex((recipe) => recipe.id === id);
      if (index < 0) return json({ detail: 'Recipe not found.' }, 404);
      state.recipes[index] = {
        ...input,
        id,
        version: `recipe-v${index + 2}`,
      };
      return json(state.recipes[index]);
    }
    if (path.startsWith('/api/recipes/') && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.recipes = state.recipes.filter((recipe) => recipe.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }

    if (path === '/api/meals' && method === 'GET') return json(state.meals);
    if (path === '/api/meals' && method === 'POST') {
      const input = await body<{
        name: string;
        description: string;
        recipes: { recipeId: number; servings: number }[];
      }>(request);
      const meal: Meal = {
        ...input,
        id: state.nextMealId++,
        version: 'meal-v1',
        recipes: input.recipes.map((item) => ({
          ...item,
          name:
            state.recipes.find((recipe) => recipe.id === item.recipeId)?.name ??
            `Recipe ${item.recipeId}`,
        })),
      };
      state.meals.push(meal);
      return json(meal);
    }
    if (path.startsWith('/api/meals/') && path.endsWith('/snapshot')) {
      const id = Number(path.split('/')[3]);
      const meal = state.meals.find((item) => item.id === id);
      if (!meal) return json({ detail: 'Meal not found.' }, 404);
      return json(snapshotForMeal(meal, state));
    }
    if (path.startsWith('/api/meals/') && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const input = await body<{
        name: string;
        description: string;
        recipes: { recipeId: number; servings: number }[];
      }>(request);
      const index = state.meals.findIndex((meal) => meal.id === id);
      if (index < 0) return json({ detail: 'Meal not found.' }, 404);
      state.meals[index] = {
        ...input,
        id,
        version: `meal-v${index + 2}`,
        recipes: input.recipes.map((item) => ({
          ...item,
          name:
            state.recipes.find((recipe) => recipe.id === item.recipeId)?.name ??
            `Recipe ${item.recipeId}`,
        })),
      };
      return json(state.meals[index]);
    }
    if (path.startsWith('/api/meals/') && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.meals = state.meals.filter((meal) => meal.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }

    if (path === '/api/plans' && method === 'GET') return json(state.plans);
    if (path === '/api/planner/generate' && method === 'POST') {
      const input = await body<{ count: number }>(request);
      return json(
        state.meals
          .slice(0, input.count)
          .map((meal) => snapshotForMeal(meal, state)),
      );
    }
    if (path.startsWith('/api/plans/') && method === 'PUT') {
      const week = path.split('/').pop() ?? '';
      const input = await body<{ meals: Snapshot[]; version?: string }>(
        request,
      );
      const existing = state.plans.find((plan) => plan.week === week);
      if (existing) {
        existing.meals = input.meals;
        existing.version = `plan-v${state.nextPlanId++}`;
      } else {
        state.plans.push({
          id: state.nextPlanId++,
          week,
          version: 'plan-v1',
          meals: input.meals,
        });
      }
      return route.fulfill({ status: 204, body: '' });
    }
    if (path.startsWith('/api/plans/') && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.plans = state.plans.filter((plan) => plan.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }

    return json(
      { detail: `Unhandled mocked API request: ${method} ${path}` },
      404,
    );
  });
}
