import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compareVisuals } from '../src/test/visualComparison';

const recipe = {
  id: 1,
  version: 'recipe-v1',
  name: 'Lemon pasta',
  description: 'Bright, easy, weeknight pasta.',
  servings: 2,
  ingredients: [{ name: 'Pasta', quantity: 200, unit: 'g', note: 'Dried' }],
  steps: ['Boil pasta, then toss with lemon.'],
};
const meal = {
  id: 1,
  version: 'meal-v1',
  name: 'Pasta night',
  description: 'A household favorite.',
  recipes: [{ recipeId: 1, name: 'Lemon pasta', servings: 4 }],
};
const snapshot = {
  mealId: 1,
  name: meal.name,
  description: meal.description,
  recipes: [{ ...recipe, recipeId: 1 }],
};

async function fixture(
  page: Page,
  options: { signedIn?: boolean; populated?: boolean } = {},
) {
  const { signedIn = true, populated = false } = options;
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/me') {
      await route.fulfill({
        status: signedIn ? 200 : 401,
        json: signedIn
          ? { id: 'admin', username: 'Alex', isAdmin: true }
          : { detail: 'Please sign in.' },
      });
      return;
    }
    const responses: Record<string, unknown> = {
      '/api/auth/csrf': { token: 'test-csrf' },
      '/api/auth/redeem': {},
      '/api/recipes': populated ? [recipe] : [],
      '/api/meals': populated ? [meal] : [],
      '/api/plans': populated
        ? [{ id: 1, week: '2026-10-19', version: 'plan-v1', meals: [snapshot] }]
        : [],
      '/api/admin/users': [
        { id: 'admin', username: 'Alex', disabled: false },
        { id: 'member', username: 'Sam', disabled: false },
      ],
      '/api/meals/1/snapshot': snapshot,
    };
    if (pathname in responses) {
      await route.fulfill({ json: responses[pathname] });
      return;
    }
    await route.fulfill({
      status: 400,
      json: {
        detail: 'No meals available. Add a meal before generating a plan.',
      },
    });
  });
}

async function capture(page: Page, info: TestInfo, name: string) {
  await expect(page.locator('body')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const baselineRoot = process.env.UI_VISUAL_BASELINE;
  const screenshot = await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
  if (baselineRoot) {
    // Baselines are opt-in and local to one OS/browser, avoiding cross-platform font differences.
    const baselineDirectory = path.join(
      baselineRoot,
      process.platform,
      info.project.name,
    );
    await mkdir(baselineDirectory, { recursive: true });
    const baselinePath = path.join(baselineDirectory, `${name}.png`);
    if (process.env.UI_UPDATE_BASELINE === '1')
      await writeFile(baselinePath, screenshot);
    else {
      const comparison = compareVisuals(
        screenshot,
        await readFile(baselinePath),
      );
      await info.attach(`${name}-visual-comparison`, {
        body: JSON.stringify(comparison),
        contentType: 'application/json',
      });
      expect(
        comparison.matches,
        `Visual baseline changed: ${baselinePath}; ${JSON.stringify(comparison)}`,
      ).toBeTruthy();
    }
  }
}

test('sign-in layout, keyboard focus, and invalid invitation', async ({
  page,
}, info) => {
  await fixture(page, { signedIn: false });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome back.' }),
  ).toBeVisible();
  const mobile = info.project.name === 'mobile';
  await expect(page.locator('form').locator('..')).toHaveCSS(
    'display',
    mobile ? 'block' : 'grid',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Username')).toBeFocused();
  await expect(page.getByLabel('Username')).toHaveCSS(
    'outline-color',
    'rgb(188, 140, 50)',
  );
  await expect(page.getByLabel('Username')).toHaveCSS('outline-width', '3px');
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toHaveCSS('background-color', 'rgb(41, 84, 63)');
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toHaveCSS('font-weight', '600');
  await capture(page, info, 'login');
  await page.goto('/join#invalid');
  await expect(
    page.getByText(
      'This link is invalid. Ask your household admin for a new one.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save account' }),
  ).toBeDisabled();
  await capture(page, info, 'invalid-invite');
  await page.goto('about:blank');
  await page.goto(`/join#invite:${'A'.repeat(64)}`);
  await page.getByLabel('Username').fill('New member');
  await page.getByLabel('Password', { exact: true }).fill('MemberOnly!Test42');
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(
    page.getByRole('heading', { name: 'You’re all set.' }),
  ).toBeVisible();
  const signIn = page.getByRole('link', { name: 'Sign in', exact: true });
  await expect(signIn).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(signIn).toHaveCSS('background-color', 'rgb(41, 84, 63)');
  await capture(page, info, 'completed-invite');
  if (info.project.name === 'desktop') {
    await signIn.hover();
    await expect(signIn).toHaveCSS('background-color', 'rgb(25, 62, 44)');
  }
});

test('empty planner, generation error, and responsive navigation', async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'What’s on the table?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'A delicious week starts with a little shuffle',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toHaveCSS('display', info.project.name === 'mobile' ? 'flex' : 'grid');
  await expect(
    page.getByRole('button', { name: 'Pick my meals' }),
  ).toBeEnabled();
  await capture(page, info, 'empty-planner');
  await page.getByRole('button', { name: 'Pick my meals' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'No meals available. Add a meal before generating a plan.',
  );
  await expect(page.getByRole('alert')).toHaveCSS(
    'background-color',
    'rgb(255, 240, 234)',
  );
  await capture(page, info, 'planner-error');
  if (info.project.name === 'desktop') {
    // Original CSS uses inclusive max-width breakpoints. Check both sides exactly.
    for (const width of [760, 761, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(
        page.getByRole('navigation', { name: 'Main navigation' }),
      ).toHaveCSS('display', width <= 760 ? 'flex' : 'grid');
      await expect(page.locator('aside')).toHaveCSS(
        'position',
        width <= 760 ? 'static' : 'sticky',
      );
      if (width > 760)
        await expect(page.locator('aside')).toHaveCSS(
          'width',
          width <= 1100 ? '210px' : '254px',
        );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
    }
  }
});

test('catalog, recipe editor, cooking dialog, saved planner, and settings', async ({
  page,
}, info) => {
  await fixture(page, { populated: true });
  await page.goto('/');
  await expect(page.getByText('Saved plan', { exact: true })).toBeVisible();
  await capture(page, info, 'saved-planner');
  await page.getByRole('button', { name: 'Cook this' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialogBox = await page.getByRole('dialog').boundingBox();
  expect(dialogBox).not.toBeNull();
  if (dialogBox) {
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.width).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
  }
  await capture(page, info, 'cooking-dialog');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Recipes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lemon pasta', exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator('article')
      .locator('..')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length,
      ),
  ).toBe(info.project.name === 'mobile' ? 1 : 2);
  await capture(page, info, 'recipes');
  await page.getByRole('button', { name: 'Add recipe', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture(page, info, 'recipe-editor');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('link', { name: 'Meals', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Pasta night', exact: true }),
  ).toBeVisible();
  await capture(page, info, 'meals');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Household settings' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reset password' }),
  ).toHaveCount(2);
  await capture(page, info, 'settings');
});
