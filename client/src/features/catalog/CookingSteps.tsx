import { Plus } from 'lucide-react';
import type { RecipeInput } from '../../api';

/**
 * Edits, adds, removes, and moves cooking steps up, reporting replacement recipes
 * through `update`. The first step cannot move up; the only remaining step cannot be removed.
 */
export function CookingSteps({
  recipe,
  update,
}: {
  recipe: RecipeInput;
  update: (recipe: RecipeInput) => void;
}) {
  return (
    <>
      <h3 className="m-[0_0_12px] text-[17px]">Cooking steps</h3>
      {recipe.steps.map((step, index) => (
        <div
          className="step-row [&&]:flex [&&]:items-center [&&]:gap-[9px] [&&_label]:flex-1"
          key={index}
        >
          <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
            Step {index + 1}
            <textarea
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0 min-h-[75px] resize-y"
              required
              maxLength={4000}
              value={step}
              onChange={(event) =>
                update({
                  ...recipe,
                  steps: recipe.steps.map((current, stepIndex) =>
                    stepIndex === index ? event.target.value : current,
                  ),
                })
              }
            />
          </label>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            type="button"
            aria-label={`Move step ${index + 1} up`}
            disabled={index === 0}
            onClick={() => {
              const steps = [...recipe.steps];
              const current = steps[index];
              const previous = steps[index - 1];
              if (current === undefined || previous === undefined) return;
              steps[index - 1] = current;
              steps[index] = previous;
              update({ ...recipe, steps });
            }}
          >
            ↑
          </button>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            type="button"
            aria-label={`Remove step ${index + 1}`}
            disabled={recipe.steps.length === 1}
            onClick={() =>
              update({
                ...recipe,
                steps: recipe.steps.filter(
                  (_, stepIndex) => stepIndex !== index,
                ),
              })
            }
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
        type="button"
        onClick={() => update({ ...recipe, steps: [...recipe.steps, ''] })}
      >
        <Plus size={16} /> Add step
      </button>
    </>
  );
}
