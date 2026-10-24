import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { MealInput, RecipeInput } from '../../api';
import { recipe } from '../../test/fixtures';
import { RecipeFields } from './RecipeFields';
import { MealFields } from './MealFields';

function RecipeForm() {
  const [value, update] = useState<RecipeInput>(recipe);
  return (
    <>
      <RecipeFields recipe={value} update={update} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

function MealForm() {
  const [value, update] = useState<MealInput>({
    name: 'Dinner',
    description: '',
    recipes: [],
  });
  return (
    <>
      <MealFields meal={value} recipes={[recipe]} update={update} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

describe('recipe and meal field behavior', () => {
  it('keeps one ingredient, supports additions and removals, and stores blank quantity as null', async () => {
    const user = userEvent.setup();
    render(<RecipeForm />);
    expect(
      screen.getByRole('button', { name: 'Remove ingredient 1' }),
    ).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Unit'), 'unspecified');
    await user.clear(screen.getByLabelText('Quantity'));
    expect(screen.getByLabelText('Quantity')).not.toBeRequired();
    expect(screen.getByTestId('value')).toHaveTextContent('"quantity":null');
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }));
    await user.type(screen.getByLabelText('Ingredient 2'), 'Salt');
    expect(screen.getByTestId('value')).toHaveTextContent('Salt');
    await user.click(
      screen.getByRole('button', { name: 'Remove ingredient 1' }),
    );
    expect(screen.getByLabelText('Ingredient 1')).toHaveValue('Salt');
  });

  it('reorders, edits, adds and removes cooking steps without losing the last row', async () => {
    const user = userEvent.setup();
    render(<RecipeForm />);
    expect(
      screen.getByRole('button', { name: 'Move step 1 up' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move step 2 up' }));
    expect(screen.getByLabelText('Step 1')).toHaveValue('Cook pasta');
    expect(screen.getByLabelText('Step 2')).toHaveValue('Boil water');
    await user.click(screen.getByRole('button', { name: 'Add step' }));
    await user.type(screen.getByLabelText('Step 3'), 'Serve');
    expect(screen.getByTestId('value')).toHaveTextContent(
      '"steps":["Cook pasta","Boil water","Serve"]',
    );
    await user.click(screen.getByRole('button', { name: 'Remove step 3' }));
    await user.click(screen.getByRole('button', { name: 'Remove step 2' }));
    expect(
      screen.getByRole('button', { name: 'Remove step 1' }),
    ).toBeDisabled();
  });

  it('selects recipes with base servings, updates target servings and removes selections', async () => {
    const user = userEvent.setup();
    render(<MealForm />);
    expect(
      screen.queryByLabelText('Servings for Pasta'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Pasta'));
    expect(screen.getByLabelText('Servings for Pasta')).toHaveValue(2);
    await user.clear(screen.getByLabelText('Servings for Pasta'));
    await user.type(screen.getByLabelText('Servings for Pasta'), '4');
    expect(screen.getByTestId('value')).toHaveTextContent(
      '"recipes":[{"recipeId":11,"servings":4}]',
    );
    await user.click(screen.getByLabelText('Pasta'));
    expect(screen.getByTestId('value')).toHaveTextContent('"recipes":[]');
  });
});
