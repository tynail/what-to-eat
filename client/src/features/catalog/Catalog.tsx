import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Empty, ErrorBox, Header } from '../../shared/ui/page';
import { CookingDetail } from '../../shared/cooking/CookingDetail';
import { CatalogEditor } from './CatalogEditor';
import { CatalogCard } from './CatalogCard';
import { useCatalog, type CatalogKind } from './useCatalog';

/** Composes collection search, cards, and dialogs around collection commands. */
export function Catalog({ kind }: { kind: CatalogKind }) {
  const catalog = useCatalog(kind);
  const [search, setSearch] = useState('');
  const recipeMode = kind === 'recipes';
  const { result } = catalog;
  return (
    <>
      <Header
        eyebrow="THE HOUSEHOLD COLLECTION"
        title={recipeMode ? 'Your recipe book' : 'Meals worth repeating'}
        text={
          recipeMode
            ? 'The ingredients and little details that make it yours.'
            : 'Bring recipes together into a meal you love.'
        }
      >
        <button className="primary" onClick={catalog.create}>
          <Plus size={18} />
          Add {recipeMode ? 'recipe' : 'meal'}
        </button>
      </Header>
      <div className="toolbar">
        <label className="search">
          Search {kind}
          <input
            type="search"
            placeholder={`Find a favorite ${recipeMode ? 'recipe' : 'meal'}…`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <span className="muted">
          {result.data?.length || 0} in your collection
        </span>
      </div>
      <ErrorBox error={catalog.error} />
      {result.isPending ? (
        <p role="status">Loading collection…</p>
      ) : !result.data?.length ? (
        <Empty
          title={`Your ${recipeMode ? 'recipe book' : 'meal collection'} starts here`}
          text={
            recipeMode
              ? 'Add your first recipe, then combine recipes into meals.'
              : 'Add a meal and choose its recipes. It will be ready for your weekly shuffle.'
          }
        />
      ) : (
        <div className="library-grid">
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
