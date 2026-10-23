import { useState } from 'react';
import type { MealInput, Recipe, RecipeInput } from '../../api';
import { useAction } from '../../shared/ui/action';
import { ErrorBox } from '../../shared/ui/page';
import { Modal } from '../../shared/ui/Modal';
import type { EditorState } from './editorState';
import { RecipeFields } from './RecipeFields';
import { MealFields } from './MealFields';

/**
 * Edits a recipe or meal in a modal, displaying save failures and disabling fields
 * while saving. A meal with no selected recipes has its save button disabled.
 *
 * `initial` is captured on mount; later prop changes do not reset the draft.
 * `recipes` supplies the meal choices. `save` receives the current editor state;
 * rejections are caught and displayed. `close` handles dismissal and is not
 * automatically called after a successful save.
 */
export function CatalogEditor({
  initial,
  recipes,
  save,
  close,
}: {
  initial: EditorState;
  recipes: Recipe[];
  save: (editor: EditorState) => Promise<void>;
  close: () => void;
}) {
  const [value, setValue] = useState(initial);
  const action = useAction();

  function updateRecipe(recipe: RecipeInput) {
    setValue((current) =>
      current.kind === 'recipe' ? { ...current, value: recipe } : current,
    );
  }

  function updateMeal(meal: MealInput) {
    setValue((current) =>
      current.kind === 'meal' ? { ...current, value: meal } : current,
    );
  }

  return (
    <Modal
      title={`${value.mode === 'saved' ? 'Edit' : 'New'} ${value.kind}`}
      close={close}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(() => save(value));
        }}
      >
        <fieldset disabled={action.busy}>
          <label>
            Name
            <input
              required
              maxLength={120}
              value={value.value.name}
              onChange={(event) => {
                const name = event.target.value;
                setValue((current) =>
                  current.kind === 'recipe'
                    ? { ...current, value: { ...current.value, name } }
                    : { ...current, value: { ...current.value, name } },
                );
              }}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={4000}
              value={value.value.description}
              onChange={(event) => {
                const description = event.target.value;
                setValue((current) =>
                  current.kind === 'recipe'
                    ? { ...current, value: { ...current.value, description } }
                    : { ...current, value: { ...current.value, description } },
                );
              }}
            />
          </label>
          {value.kind === 'recipe' ? (
            <RecipeFields recipe={value.value} update={updateRecipe} />
          ) : (
            <MealFields
              meal={value.value}
              recipes={recipes}
              update={updateMeal}
            />
          )}
          <ErrorBox error={action.error} />
          <div className="form-actions">
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={
                value.kind === 'meal' && value.value.recipes.length === 0
              }
            >
              {action.busy ? 'Saving…' : `Save ${value.kind}`}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
