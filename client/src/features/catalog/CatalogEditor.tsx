import { useState } from 'react';
import type { MealInput, Recipe, RecipeInput } from '../../api';
import { useAction } from '../../shared/ui/action';
import { ErrorBox } from '../../shared/ui/page';
import { Modal } from '../../shared/ui/Modal';
import type { EditorState } from './editorState';
import { RecipeFields } from './RecipeFields';
import { MealFields } from './MealFields';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const action = useAction();

  /** Replaces the recipe input while retaining editor metadata; ignores meal state. */
  function updateRecipe(recipe: RecipeInput) {
    setValue((current) =>
      current.kind === 'recipe' ? { ...current, value: recipe } : current,
    );
  }

  /** Replaces the meal input while retaining editor metadata; ignores recipe state. */
  function updateMeal(meal: MealInput) {
    setValue((current) =>
      current.kind === 'meal' ? { ...current, value: meal } : current,
    );
  }

  return (
    <Modal
      title={
        value.mode === 'saved'
          ? value.kind === 'recipe'
            ? t('editRecipe')
            : t('editMeal')
          : value.kind === 'recipe'
            ? t('newRecipe')
            : t('newMeal')
      }
      close={close}
    >
      <form
        className="[&_h3]:mt-[26px]"
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(() => save(value));
        }}
      >
        <fieldset className="border-0 m-0 p-0 min-w-0" disabled={action.busy}>
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            {t('name')}
            <input
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
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
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            {t('description')}
            <textarea
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0 min-h-[75px] resize-y"
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
          <div className="form-actions [&&]:flex [&&]:justify-end [&&]:gap-[10px] [&&]:[border-top:1px_solid_#e3e8da] [&&]:mt-[26px] [&&]:pt-[18px]">
            <button
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
              type="button"
              onClick={close}
            >
              {t('cancel')}
            </button>
            <button
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
              disabled={
                value.kind === 'meal' && value.value.recipes.length === 0
              }
            >
              {action.busy
                ? t('saving')
                : value.kind === 'recipe'
                  ? t('saveRecipe')
                  : t('saveMeal')}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
