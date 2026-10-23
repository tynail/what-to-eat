import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Utensils } from "lucide-react";
import { api, apiParsed, parseMeals, parseRecipes, parseSnapshot, type Meal, type Recipe, type Snapshot, type SnapshotRecipe } from "../../api";
import { blankMeal, blankRecipe } from "./factories";
import { CatalogEditor, editRecord, type EditorState } from "./CatalogEditor";
import { useAction } from "../../shared/ui/action";
import { Empty, ErrorBox, Header } from "../../shared/ui/page";
import { CookingDetail } from "../../shared/cooking/CookingDetail";

function isRecipe(value: Recipe | Meal): value is Recipe {
  return "ingredients" in value;
}

/** Converts a recipe for the cooking view, replacing its ID with `recipeId` and omitting its version. */
function recipeSnapshot(recipe: Recipe): SnapshotRecipe {
  const { id, version, ...snapshot } = recipe;
  return { ...snapshot, recipeId: id };
}

/** Displays the requested collection with name search, cooking previews, and create, edit, and delete actions. */
export function Catalog({ kind }: { kind: "recipes" | "meals" }) {
  const recipes = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiParsed("/recipes", parseRecipes),
  });
  const meals = useQuery({
    queryKey: ["meals"],
    queryFn: () => apiParsed("/meals", parseMeals),
  });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditorState | null>(null);
  const [view, setView] = useState<Snapshot | null>(null);
  const action = useAction();
  const qc = useQueryClient();
  const recipeMode = kind === "recipes";
  const result = recipeMode ? recipes : meals;
  /**
   * Submits the editor's input, including its version when updating, then invalidates
   * the collection (and meals after a recipe change) and closes the editor.
   * Request and invalidation errors propagate to the editor's submission handler.
   */
  async function save(editor: EditorState) {
    const collection = editor.kind === "recipe" ? "recipes" : "meals";
    if (editor.mode === "new") {
      await api(`/${editor.kind === "recipe" ? "recipes" : "meals"}`, { method: "POST", body: editor.value });
    } else {
      await api(`/${editor.kind === "recipe" ? "recipes" : "meals"}/${editor.id}`, {
        method: "PUT",
        body: { ...editor.value, version: editor.version },
      });
    }
    await qc.invalidateQueries({ queryKey: [editor.kind === "recipe" ? "recipes" : "meals"] });
    if (editor.kind === "recipe") await qc.invalidateQueries({ queryKey: ["meals"] });
    setEditing(null);
  }
  return (
    <>
      <Header
        eyebrow="THE HOUSEHOLD COLLECTION"
        title={recipeMode ? "Your recipe book" : "Meals worth repeating"}
        text={
          recipeMode
            ? "The ingredients and little details that make it yours."
            : "Bring recipes together into a meal you love."
        }
      >
        <button
          className="primary"
          onClick={() => setEditing(recipeMode
            ? { kind: "recipe", mode: "new", value: blankRecipe() }
            : { kind: "meal", mode: "new", value: blankMeal() })}
        >
          <Plus size={18} />
          Add {recipeMode ? "recipe" : "meal"}
        </button>
      </Header>
      <div className="toolbar">
        <label className="search">
          Search {kind}
          <input
            type="search"
            placeholder={`Find a favorite ${recipeMode ? "recipe" : "meal"}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted">
          {result.data?.length || 0} in your collection
        </span>
      </div>
      <ErrorBox error={action.error || result.error} />
      {result.isPending ? (
        <p role="status">Loading collection…</p>
      ) : !result.data?.length ? (
        <Empty
          title={`Your ${recipeMode ? "recipe book" : "meal collection"} starts here`}
          text={
            recipeMode
              ? "Add your first recipe, then combine recipes into meals."
              : "Add a meal and choose its recipes. It will be ready for your weekly shuffle."
          }
        />
      ) : (
        <div className="library-grid">
          {result.data
            .filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))
            .map((item) => {
              return <article className="library-card" key={item.id}>
                <div className="card-top">
                  <span className="food-icon">
                    {isRecipe(item) ? <BookOpen /> : <Utensils />}
                  </span>
                  <span className="pill">
                    {isRecipe(item) ? `${item.servings} servings` : `${item.recipes.length} recipes`}
                  </span>
                </div>
                <h2>{item.name}</h2>
                <p className="muted">
                  {item.description ||
                    (isRecipe(item)
                      ? "A household favorite in the making."
                      : item.recipes.map((r) => r.name).join(" + "))}
                </p>
                <div className="card-actions">
                  <button
                    onClick={() =>
                      void action.run(async () => {
                        setView(
                          isRecipe(item)
                           ? {
                                 mealId: item.id,
                                 name: item.name,
                                 description: item.description,
                                 recipes: [recipeSnapshot(item)],
                               }
                            : await apiParsed(`/meals/${item.id}/snapshot`, parseSnapshot),
                        );
                      })
                    }
                  >
                    View
                  </button>
                   <button onClick={() => setEditing(editRecord(structuredClone(item)))}>
                    Edit
                  </button>
                  <button
                    className="danger text-button"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete “${item.name}”? Saved weeks will keep their copy.`,
                        )
                      )
                        void action.run(async () => {
                          await api(`/${kind}/${item.id}?version=${item.version}`, { method: "DELETE" });
                          await qc.invalidateQueries({ queryKey: [kind] });
                          if (recipeMode)
                            await qc.invalidateQueries({ queryKey: ["meals"] });
                        });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>;
            })}
        </div>
      )}
      {editing && (
        <CatalogEditor
          key={`${editing.kind}-${editing.mode}-${editing.mode === "saved" ? editing.id : "new"}`}
          initial={editing}
          recipes={recipes.data || []}
          save={save}
          close={() => setEditing(null)}
        />
      )}
      {view && <CookingDetail meal={view} close={() => setView(null)} />}
    </>
  );
}
