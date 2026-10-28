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
  await expect(page.getByTestId('auth-heading')).toHaveRole('heading');
  await expect(page.getByTestId('auth-submit')).toHaveAccessibleName('Sign in');
  await expect(page.getByTestId('auth-username')).toHaveAccessibleName(
    'Username',
  );
  await expect(page.getByTestId('language-trigger')).toHaveAccessibleName(
    'Language',
  );
  await expect(page.getByTestId('auth-heading')).toBeVisible();
  await expect(page.getByTestId('auth-heading')).toHaveText('Welcome back.');
  const mobile = info.project.name === 'mobile';
  await expect(page.getByTestId('auth-page')).toHaveCSS(
    'display',
    mobile ? 'block' : 'grid',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('language-trigger')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('auth-username')).toBeFocused();
  await expect(page.getByTestId('auth-username')).toHaveCSS(
    'outline-color',
    'rgb(188, 140, 50)',
  );
  await expect(page.getByTestId('auth-username')).toHaveCSS(
    'outline-width',
    '3px',
  );
  await expect(page.getByTestId('auth-submit')).toHaveCSS(
    'background-color',
    'rgb(41, 84, 63)',
  );
  await expect(page.getByTestId('auth-submit')).toHaveCSS('font-weight', '600');
  await capture(page, info, 'login');
  await page.goto('/join#invalid');
  await expect(page.getByTestId('auth-hint')).toBeVisible();
  await expect(page.getByTestId('auth-hint')).toHaveText(
    'This link is invalid. Ask your household admin for a new one.',
  );
  await expect(page.getByTestId('auth-submit')).toBeDisabled();
  await capture(page, info, 'invalid-invite');
  await page.goto('about:blank');
  await page.goto(`/join#invite:${'A'.repeat(64)}`);
  await page.getByTestId('auth-username').fill('New member');
  await page.getByTestId('auth-password').fill('MemberOnly!Test42');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('auth-heading')).toBeVisible();
  await expect(page.getByTestId('auth-heading')).toHaveText('You’re all set.');
  const signIn = page.getByTestId('auth-sign-in-link');
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
  await expect(page.getByTestId('page-title')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveText(
    'What’s on the table?',
  );
  await expect(page.getByTestId('empty-state-title')).toBeVisible();
  await expect(page.getByTestId('empty-state-title')).toHaveRole('heading');
  await expect(page.getByTestId('empty-state-title')).toHaveText(
    'A delicious week starts with a little shuffle',
  );
  await expect(page.getByTestId('main-navigation')).toHaveRole('navigation');
  await expect(page.getByTestId('main-navigation')).toHaveAccessibleName(
    'Main navigation',
  );
  await expect(page.getByTestId('main-navigation')).toHaveCSS(
    'display',
    info.project.name === 'mobile' ? 'flex' : 'grid',
  );
  await expect(page.getByTestId('planner-generate')).toBeEnabled();
  await expect(page.getByTestId('planner-generate')).toHaveRole('button');
  await expect(page.getByTestId('planner-generate')).toHaveAccessibleName(
    'Pick my meals',
  );
  await capture(page, info, 'empty-planner');
  await page.getByTestId('planner-generate').click();
  await expect(page.getByTestId('error-message')).toHaveRole('alert');
  await expect(page.getByTestId('error-message')).toHaveText(
    'No meals available. Add a meal before generating a plan.',
  );
  await expect(page.getByTestId('error-message')).toHaveCSS(
    'background-color',
    'rgb(255, 240, 234)',
  );
  await capture(page, info, 'planner-error');
  if (info.project.name === 'desktop') {
    // Original CSS uses inclusive max-width breakpoints. Check both sides exactly.
    for (const width of [760, 761, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByTestId('main-navigation')).toHaveCSS(
        'display',
        width <= 760 ? 'flex' : 'grid',
      );
      await expect(page.getByTestId('sidebar')).toHaveCSS(
        'position',
        width <= 760 ? 'static' : 'sticky',
      );
      if (width > 760)
        await expect(page.getByTestId('sidebar')).toHaveCSS(
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

test('language picker translates live without leaving current page', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await expect(page.getByTestId('page-title')).toHaveRole('heading');
  const picker = page.getByTestId('language-trigger');
  await picker.click();
  await expect(page.getByTestId('language-option-fr')).toHaveRole(
    'menuitemradio',
  );
  await expect(page.getByTestId('language-option-fr')).toHaveAccessibleName(
    'Français',
  );
  await page.getByTestId('language-option-fr').click();
  await expect(page.getByTestId('page-title')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveText(
    'Qu’est-ce qu’on mange?',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr-CA');
  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId('language-trigger').click();
  await expect(page.getByTestId('language-option-en')).toHaveRole(
    'menuitemradio',
  );
  await expect(page.getByTestId('language-option-en')).toHaveAccessibleName(
    'English',
  );
  await page.getByTestId('language-option-en').click();
  await expect(page.getByTestId('page-title')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveText(
    'What’s on the table?',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-CA');
});

test('catalog, recipe editor, cooking dialog, saved planner, and settings', async ({
  page,
}, info) => {
  await fixture(page, { populated: true });
  await page.goto('/');
  await expect(page.getByTestId('planner-status')).toBeVisible();
  await expect(page.getByTestId('planner-status')).toHaveText('Saved plan');
  await capture(page, info, 'saved-planner');
  await page
    .getByTestId(`lineup-meal-${meal.id}`)
    .getByTestId('lineup-cook')
    .click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await expect(page.getByTestId('modal')).toHaveRole('dialog');
  const dialogBox = await page.getByTestId('modal').boundingBox();
  expect(dialogBox).not.toBeNull();
  if (dialogBox) {
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.width).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
  }
  await capture(page, info, 'cooking-dialog');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('modal')).toHaveCount(0);
  await page.getByTestId('nav-recipes').click();
  await expect(
    page.getByTestId(`recipe-card-${recipe.id}`).getByTestId('card-title'),
  ).toBeVisible();
  await expect(
    page.getByTestId(`recipe-card-${recipe.id}`).getByTestId('card-title'),
  ).toHaveRole('heading');
  await expect(
    page.getByTestId(`recipe-card-${recipe.id}`).getByTestId('card-title'),
  ).toHaveText('Lemon pasta');
  expect(
    await page
      .getByTestId('catalog-grid')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length,
      ),
  ).toBe(info.project.name === 'mobile' ? 1 : 2);
  await capture(page, info, 'recipes');
  await page.getByTestId('catalog-add').click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await expect(page.getByTestId('modal')).toHaveRole('dialog');
  await capture(page, info, 'recipe-editor');
  await page.getByTestId('modal-close').click();
  await page.getByTestId('nav-meals').click();
  await expect(
    page.getByTestId(`meal-card-${meal.id}`).getByTestId('card-title'),
  ).toBeVisible();
  await expect(
    page.getByTestId(`meal-card-${meal.id}`).getByTestId('card-title'),
  ).toHaveText('Pasta night');
  await capture(page, info, 'meals');
  await page.getByTestId('nav-settings').click();
  await expect(page.getByTestId('page-title')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveText('Household settings');
  await expect(page.getByTestId('household-reset-password')).toHaveCount(2);
  await capture(page, info, 'settings');
});
