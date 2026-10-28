import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CookingDetail } from '../../shared/cooking/CookingDetail';
import { Empty, ErrorBox, Header } from '../../shared/ui/page';
import { CatalogCard } from './CatalogCard';
import { CatalogEditor } from './CatalogEditor';
import { useCatalog, type CatalogKind } from './useCatalog';

/** Composes collection search, cards, and dialogs around collection commands. */
export function Catalog({ kind }: { kind: CatalogKind }) {
  const { t } = useTranslation();
  const catalog = useCatalog(kind);
  const [search, setSearch] = useState('');
  const recipeMode = kind === 'recipes';
  const { result } = catalog;
  return (
    <>
      <Header
        eyebrow={t('collection')}
        title={recipeMode ? t('recipeBook') : t('repeatMeals')}
        text={recipeMode ? t('recipeText') : t('mealText')}
      >
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
          data-cy="catalog-add"
          onClick={catalog.create}
        >
          <Plus size={18} />
          {recipeMode ? t('addRecipe') : t('addMeal')}
        </button>
      </Header>
      <div className="toolbar [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[15px] [&&]:mb-[23px] [@media(max-width:760px)]:[&&]:flex-wrap">
        <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px] search [&&]:w-[350px] [&&]:m-0 [@media(max-width:760px)]:[&&]:w-full">
          {recipeMode ? t('searchRecipes') : t('searchMeals')}
          <input
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
            type="search"
            placeholder={recipeMode ? t('findRecipe') : t('findMeal')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <span className="muted [&&]:text-[#768076]">
          {t('inCollection', { count: result.data?.length || 0 })}
        </span>
      </div>
      <ErrorBox error={catalog.error} />
      {result.isPending ? (
        <p className="m-[0_0_12px]" role="status">
          {t('loadingCollection')}
        </p>
      ) : !result.data?.length ? (
        <Empty
          title={recipeMode ? t('recipeStart') : t('mealStart')}
          text={recipeMode ? t('recipeStartText') : t('mealStartText')}
        />
      ) : (
        <div
          data-cy="catalog-grid"
          className="library-grid [&&]:grid [&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&]:gap-[20px] [@media(max-width:760px)]:[&&]:grid-cols-[1fr]"
        >
          {result.data
            .filter((item) =>
              item.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((item) => (
              <CatalogCard
                key={item.id}
                item={item}
                onView={(item) => void catalog.preview(item)}
                onEdit={catalog.edit}
                onDelete={(item) => void catalog.remove(item)}
              />
            ))}
        </div>
      )}
      {catalog.editing && (
        <CatalogEditor
          key={`${catalog.editing.kind}-${catalog.editing.mode}-${catalog.editing.mode === 'saved' ? catalog.editing.id : 'new'}`}
          initial={catalog.editing}
          recipes={catalog.recipes}
          save={catalog.save}
          close={catalog.closeEditor}
        />
      )}
      {catalog.view && (
        <CookingDetail meal={catalog.view} close={catalog.closeView} />
      )}
    </>
  );
}
