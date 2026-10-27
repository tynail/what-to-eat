import { test, expect } from '@playwright/test';
import { createApiState, mockApi } from './apiFixture';

test('household invitation, cooking library, planner, history, and keyboard access', async ({
  page,
  browser,
}, info) => {
  const state = createApiState();
  const session = { user: null };
  await mockApi(page, state, session);
  const suffix = `${info.project.name}-${Date.now()}`;
  await page.goto('/');
  await page
    .getByLabel('Username')
    .fill(process.env.E2E_USERNAME || 'e2eadmin');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.E2E_PASSWORD || 'LocalOnly!Test42');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'What’s on the table?' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Create invite link' }).click();
  const link = await page
    .getByLabel('Copy this private link and share it directly')
    .inputValue();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await mockApi(guest, state, { user: null });
  await guest.goto(link);
  await guest.getByLabel('Username').fill(`member-${suffix}`);
  await guest.getByLabel('Password', { exact: true }).fill('MemberOnly!Test42');
  await guest.getByRole('button', { name: 'Save account' }).click();
  await expect(
    guest.getByRole('heading', { name: 'You’re all set.' }),
  ).toBeVisible();
  await guest.getByRole('link', { name: 'Sign in' }).click();
  await guest.getByLabel('Username').fill(`member-${suffix}`);
  await guest.getByLabel('Password', { exact: true }).fill('MemberOnly!Test42');
  await guest.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    guest.getByRole('heading', { name: 'What’s on the table?' }),
  ).toBeVisible();
  await guestContext.close();
  await page.getByRole('link', { name: 'Recipes', exact: true }).click();
  await page.getByRole('button', { name: 'Add recipe', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(`Lemon pasta ${suffix}`);
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Bright, easy, weeknight pasta.');
  await page.getByLabel('Ingredient 1', { exact: true }).fill('Pasta');
  await page.getByLabel('Quantity', { exact: true }).fill('200');
  await page
    .getByRole('combobox', { name: 'Unit', exact: true })
    .selectOption('g');
  await page
    .getByLabel('Step 1', { exact: true })
    .fill('Boil pasta, then toss with lemon.');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  const recipeCard = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: `Lemon pasta ${suffix}`,
      exact: true,
    }),
  });
  await expect(recipeCard).toBeVisible();
  await recipeCard.getByRole('button', { name: 'Edit', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('A fresh household favorite.');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await page.getByRole('link', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: 'Add meal', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(`Pasta night ${suffix}`);
  await page.getByLabel(`Lemon pasta ${suffix}`, { exact: true }).check();
  await page.getByLabel(`Servings for Lemon pasta ${suffix}`).fill('4');
  await page.getByRole('button', { name: 'Save meal', exact: true }).click();
  await page.getByRole('link', { name: 'This Week', exact: true }).click();
  await page.getByLabel('Number of meals').fill('1');
  await page.getByRole('button', { name: 'Pick my meals' }).click();
  await expect(
    page.getByText('Unsaved preview', { exact: true }),
  ).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Save week', exact: true }).click();
  await expect(page.getByText('Saved plan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cook this' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.getByText('Saved plan', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/${info.project.name}-planner.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Meals', exact: true }).click();
  const mealCard = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: `Pasta night ${suffix}`,
      exact: true,
    }),
  });
  await mealCard.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(mealCard).toHaveCount(0);
  await page.getByRole('link', { name: 'Recipes', exact: true }).click();
  await recipeCard.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(recipeCard).toHaveCount(0);
  await page.getByRole('link', { name: 'This Week', exact: true }).click();
  await expect(page.getByText('Saved plan', { exact: true })).toBeVisible();
});
