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
      <p className="muted">{meal.description}</p>
      {meal.recipes.map((recipe, index) => (
        <section className="recipe-detail" key={index}>
          <p className="eyebrow">{recipe.servings} SERVINGS</p>
          <h3>{recipe.name}</h3>
          <p>{recipe.description}</p>
          <h4>Ingredients</h4>
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
          <h4>How to make it</h4>
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
