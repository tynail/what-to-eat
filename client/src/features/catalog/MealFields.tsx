import type { MealInput, Recipe } from '../../api';
import { useTranslation } from 'react-i18next';

/**
 * Renders recipe selection and target servings, reporting replacement meal values
 * through `update`. Newly selected recipes start with their base servings; the
 * target-servings inputs accept values from 0.01 through 1000, inclusive.
 */
export function MealFields({
  meal,
  recipes,
  update,
}: {
  meal: MealInput;
  recipes: Recipe[];
  update: (meal: MealInput) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h3 className="m-[0_0_12px] text-[17px]">{t('recipesMeal')}</h3>
      <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
        {t('recipesMealText')}
      </p>
      {recipes.length === 0 && (
        <p className="m-[0_0_12px]">{t('firstRecipe')}</p>
      )}
      {recipes.map((recipe) => {
        const selected = meal.recipes.find(
          (item) => item.recipeId === recipe.id,
        );
        return (
          <div
            className="recipe-choice [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[15px] [&&]:[border-bottom:1px_solid_#e7ebdf] [&&]:p-[12px_0] [&&_>_label:not(.check)]:w-[115px] [&&_>_label:not(.check)]:m-0"
            key={recipe.id}
          >
            <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px] check [&&]:flex [&&]:gap-[9px] [&&]:items-center [&&]:m-0 [&&_input]:w-[16px] [&&_input]:h-[16px] [&&_input]:[accent-color:#31593d]">
              <input
                className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
                type="checkbox"
                checked={selected !== undefined}
                onChange={(event) =>
                  update({
                    ...meal,
                    recipes: event.target.checked
                      ? [
                          ...meal.recipes,
                          { recipeId: recipe.id, servings: recipe.servings },
                        ]
                      : meal.recipes.filter(
                          (item) => item.recipeId !== recipe.id,
                        ),
                  })
                }
              />
              {recipe.name}
            </label>
            {selected && (
              <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
                {t('targetServings')}
                <input
                  className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
                  aria-label={t('servingsFor', { name: recipe.name })}
                  required
                  type="number"
                  min="0.01"
                  max="1000"
                  step="any"
                  value={selected.servings}
                  onChange={(event) =>
                    update({
                      ...meal,
                      recipes: meal.recipes.map((item) =>
                        item.recipeId === recipe.id
                          ? { ...item, servings: Number(event.target.value) }
                          : item,
                      ),
                    })
                  }
                />
              </label>
            )}
          </div>
        );
      })}
    </>
  );
}
