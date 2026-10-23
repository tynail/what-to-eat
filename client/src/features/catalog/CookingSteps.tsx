import { Plus } from 'lucide-react';
import type { RecipeInput } from '../../api';

export function CookingSteps({
  recipe,
  update,
}: {
  recipe: RecipeInput;
  update: (recipe: RecipeInput) => void;
}) {
  return (
    <>
      <h3>Cooking steps</h3>
      {recipe.steps.map((step, index) => (
        <div className="step-row" key={index}>
          <label>
            Step {index + 1}
            <textarea
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
        type="button"
        onClick={() => update({ ...recipe, steps: [...recipe.steps, ''] })}
      >
        <Plus size={16} /> Add step
      </button>
    </>
  );
}
