import { BookOpen, Utensils } from 'lucide-react';
import type { Meal, Recipe } from '../../api';
import { isRecipe } from './editorState';

export function CatalogCard({
  item,
  onView,
  onEdit,
  onDelete,
}: {
  item: Recipe | Meal;
  onView: (item: Recipe | Meal) => void;
  onEdit: (item: Recipe | Meal) => void;
  onDelete: (item: Recipe | Meal) => void;
}) {
  return (
    <article className="library-card">
      <div className="card-top">
        <span className="food-icon">
          {isRecipe(item) ? <BookOpen /> : <Utensils />}
        </span>
        <span className="pill">
          {isRecipe(item)
            ? `${item.servings} servings`
            : `${item.recipes.length} recipes`}
        </span>
      </div>
      <h2>{item.name}</h2>
      <p className="muted">
        {item.description ||
          (isRecipe(item)
            ? 'A household favorite in the making.'
            : item.recipes.map((r) => r.name).join(' + '))}
      </p>
      <div className="card-actions">
        <button onClick={() => onView(item)}>View</button>
        <button onClick={() => onEdit(item)}>Edit</button>
        <button className="danger text-button" onClick={() => onDelete(item)}>
          Delete
        </button>
      </div>
    </article>
  );
}
