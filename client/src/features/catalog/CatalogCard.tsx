import { BookOpen, Utensils } from 'lucide-react';
import type { Meal, Recipe } from '../../api';
import { isRecipe } from './editorState';
import { useTranslation } from 'react-i18next';

/** Renders a recipe or meal summary, passing the item to view, edit, and delete callbacks. */
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
  const { t } = useTranslation();
  return (
    <article className="library-card [&&]:bg-[white] [&&]:[border:1px_solid_#e0e6d7] [&&]:rounded-[12px] [&&]:p-[23px] [&&]:flex [&&]:flex-col [&&_h2]:[font:24px_Georgia,_serif] [&&_h2]:[overflow-wrap:anywhere] [&&_p]:text-[12px] [&&_p]:flex-1">
      <div className="card-top [&&]:flex [&&]:justify-between [&&]:items-center [&&]:mb-[20px]">
        <span className="food-icon [&&]:bg-[#ecf0e3] [&&]:text-[#7b9061] [&&]:p-[13px] [&&]:rounded-[12px] [&&]:flex">
          {isRecipe(item) ? <BookOpen /> : <Utensils />}
        </span>
        <span className="pill [&&]:inline-flex [&&]:text-[10px] [&&]:[font-weight:650] [&&]:rounded-[20px] [&&]:bg-[#f4f6ed] [&&]:text-[#75845b] [&&]:p-[5px_11px] [&&]:tracking-[0.4px]">
          {isRecipe(item)
            ? t('servings', { count: item.servings })
            : t('recipesCount', { count: item.recipes.length })}
        </span>
      </div>
      <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
        {item.name}
      </h2>
      <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
        {item.description ||
          (isRecipe(item)
            ? t('fallbackRecipe')
            : item.recipes.map((r) => r.name).join(' + '))}
      </p>
      <div className="card-actions [&&]:flex [&&]:gap-[8px] [&&]:mt-[16px] [&&_button]:text-[12px]">
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
          onClick={() => onView(item)}
        >
          {t('view')}
        </button>
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
          onClick={() => onEdit(item)}
        >
          {t('edit')}
        </button>
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] danger [&&]:text-[#a64e3f] text-button [&&]:[background:none] [&&]:border-0 [&&]:pl-[0]"
          onClick={() => onDelete(item)}
        >
          {t('delete')}
        </button>
      </div>
    </article>
  );
}
