import { test, expect } from '@playwright/test';
import { createApiState, mockApi } from './apiFixture';

test('household invitation, cooking library, planner, history, and keyboard access', async ({
  page,
  browser,
}, info) => {
  const state = createApiState();
  const session = { user: null };
  const recipeId = state.nextRecipeId;
  const mealId = state.nextMealId;
  await mockApi(page, state, session);
  const suffix = `${info.project.name}-${Date.now()}`;
  await page.goto('/');
  await page
    .getByTestId('auth-username')
    .fill(process.env.E2E_USERNAME || 'e2eadmin');
  await page
    .getByTestId('auth-password')
    .fill(process.env.E2E_PASSWORD || 'LocalOnly!Test42');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('page-title')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveRole('heading');
  await expect(page.getByTestId('page-title')).toHaveText(
    'What’s on the table?',
  );
  await page.getByTestId('nav-settings').click();
  await page.getByTestId('household-invite').click();
  const link = await page.getByTestId('household-share-link').inputValue();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await mockApi(guest, state, { user: null });
  await guest.goto(link);
  await guest.getByTestId('auth-username').fill(`member-${suffix}`);
  await guest.getByTestId('auth-password').fill('MemberOnly!Test42');
  await guest.getByTestId('auth-submit').click();
  await expect(guest.getByTestId('auth-heading')).toBeVisible();
  await expect(guest.getByTestId('auth-heading')).toHaveRole('heading');
  await expect(guest.getByTestId('auth-heading')).toHaveText('You’re all set.');
  await guest.getByTestId('auth-sign-in-link').click();
  await guest.getByTestId('auth-username').fill(`member-${suffix}`);
  await guest.getByTestId('auth-password').fill('MemberOnly!Test42');
  await guest.getByTestId('auth-submit').click();
  await expect(guest.getByTestId('page-title')).toBeVisible();
  await expect(guest.getByTestId('page-title')).toHaveText(
    'What’s on the table?',
  );
  await guestContext.close();
  await page.getByTestId('nav-recipes').click();
  await page.getByTestId('catalog-add').click();
  await page.getByTestId('editor-name').fill(`Lemon pasta ${suffix}`);
  await page
    .getByTestId('editor-description')
    .fill('Bright, easy, weeknight pasta.');
  await page
    .getByTestId('ingredient-row-0')
    .getByTestId('ingredient-name')
    .fill('Pasta');
  await page
    .getByTestId('ingredient-row-0')
    .getByTestId('ingredient-quantity')
    .fill('200');
  await page
    .getByTestId('ingredient-row-0')
    .getByTestId('ingredient-unit')
    .selectOption('g');
  await page
    .getByTestId('step-row-0')
    .getByTestId('step-text')
    .fill('Boil pasta, then toss with lemon.');
  await page.getByTestId('editor-save').click();
  const recipeCard = page.getByTestId(`recipe-card-${recipeId}`);
  await expect(recipeCard.getByTestId('card-title')).toHaveText(
    `Lemon pasta ${suffix}`,
  );
  await expect(recipeCard).toBeVisible();
  await recipeCard.getByTestId('card-edit').click();
  await page
    .getByTestId('editor-description')
    .fill('A fresh household favorite.');
  await page.getByTestId('editor-save').click();
  await page.getByTestId('nav-meals').click();
  await page.getByTestId('catalog-add').click();
  await page.getByTestId('editor-name').fill(`Pasta night ${suffix}`);
  await page
    .getByTestId(`meal-choice-${recipeId}`)
    .getByTestId('meal-recipe-selected')
    .check();
  await page
    .getByTestId(`meal-choice-${recipeId}`)
    .getByTestId('meal-recipe-servings')
    .fill('4');
  await page.getByTestId('editor-save').click();
  await page.getByTestId('nav-week').click();
  await page.getByTestId('planner-count').fill('1');
  await page.getByTestId('planner-generate').click();
  await expect(page.getByTestId('planner-status')).toBeVisible();
  await expect(page.getByTestId('planner-status')).toHaveText(
    'Unsaved preview',
  );
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('save-week').click();
  await expect(page.getByTestId('planner-status')).toBeVisible();
  await expect(page.getByTestId('planner-status')).toHaveText('Saved plan');
  await page
    .getByTestId(`lineup-meal-${mealId}`)
    .getByTestId('lineup-cook')
    .click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('modal')).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId('planner-status')).toBeVisible();
  await expect(page.getByTestId('planner-status')).toHaveText('Saved plan');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/${info.project.name}-planner.png`,
    fullPage: true,
  });
  await page.getByTestId('nav-meals').click();
  const mealCard = page.getByTestId(`meal-card-${mealId}`);
  await expect(mealCard.getByTestId('card-title')).toHaveText(
    `Pasta night ${suffix}`,
  );
  await mealCard.getByTestId('card-delete').click();
  await expect(mealCard).toHaveCount(0);
  await page.getByTestId('nav-recipes').click();
  await recipeCard.getByTestId('card-delete').click();
  await expect(recipeCard).toHaveCount(0);
  await page.getByTestId('nav-week').click();
  await expect(page.getByTestId('planner-status')).toBeVisible();
  await expect(page.getByTestId('planner-status')).toHaveText('Saved plan');
});
