import type { Snapshot } from '../api/types';
import { Modal } from '../ui/Modal';

export function CookingDetail({
  meal,
  close,
}: {
  meal: Snapshot;
  close: () => void;
}) {
  return (
    <Modal title={meal.name} close={close}>
      <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
        {meal.description}
      </p>
      {meal.recipes.map((recipe, index) => (
        <section
          className="recipe-detail [&&]:[border-top:1px_solid_#dce4d4] [&&]:mt-[25px] [&&]:pt-[22px] [&&_li]:mb-[10px] [&&_li]:whitespace-pre-wrap [&&_li]:[overflow-wrap:anywhere] [&&_h3]:[font:25px_Georgia,_serif]"
          key={index}
        >
          <p className="m-[0_0_12px] eyebrow [&&]:text-[#748166] [&&]:text-[10px] [&&]:tracking-[1.9px] [&&]:[font-weight:750] [&&]:mb-[12px]">
            {recipe.servings} SERVINGS
          </p>
          <h3 className="m-[0_0_12px] text-[17px]">{recipe.name}</h3>
          <p className="m-[0_0_12px]">{recipe.description}</p>
          <h4 className="m-[0_0_12px]">Ingredients</h4>
          <ul>
            {recipe.ingredients.map((ingredient, ingredientIndex) => (
              <li key={ingredientIndex}>
                {ingredient.quantity == null
                  ? ''
                  : Number(ingredient.quantity.toFixed(3))}{' '}
                {ingredient.unit === 'unspecified' ? '' : ingredient.unit}{' '}
                <strong>{ingredient.name}</strong>
                {ingredient.note && ` — ${ingredient.note}`}
              </li>
            ))}
          </ul>
          <h4 className="m-[0_0_12px]">How to make it</h4>
          <ol>
            {recipe.steps.map((step, stepIndex) => (
              <li key={stepIndex}>{step}</li>
            ))}
          </ol>
        </section>
      ))}
    </Modal>
  );
}
