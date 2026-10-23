import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Utensils } from "lucide-react";
import { api, apiParsed, parseMeals, parseRecipes, parseSnapshot, type Ingredient, type Meal, type Recipe, type Snapshot } from "../../api";
import { blankIngredient, blankMeal, blankRecipe, units } from "./factories";
import { useAction } from "../../shared/ui/action";
import { Empty, ErrorBox, Header } from "../../shared/ui/page";
import { Modal } from "../../shared/ui/Modal";
import { CookingDetail } from "../../shared/cooking/CookingDetail";

function isRecipe(value: Recipe | Meal): value is Recipe {
  return "ingredients" in value;
}
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
  const [editing, setEditing] = useState<Recipe | Meal | null>(null);
  const [view, setView] = useState<Snapshot | null>(null);
  const action = useAction();
  const qc = useQueryClient();
  const recipeMode = kind === "recipes";
  const result = recipeMode ? recipes : meals;
  async function save(value: Recipe | Meal) {
    await api(
      `/${kind}${value.id ? `/${value.id}` : ""}`,
      value.id ? "PUT" : "POST",
      { ...value, version: value.version || null },
    );
    await qc.invalidateQueries({ queryKey: [kind] });
    if (recipeMode) await qc.invalidateQueries({ queryKey: ["meals"] });
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
          onClick={() => setEditing(recipeMode ? blankRecipe() : blankMeal())}
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
              const recipe = isRecipe(item);
              return <article className="library-card" key={item.id}>
                <div className="card-top">
                  <span className="food-icon">
                    {recipe ? <BookOpen /> : <Utensils />}
                  </span>
                  <span className="pill">
                    {recipe ? `${item.servings} servings` : `${item.recipes.length} recipes`}
                  </span>
                </div>
                <h2>{item.name}</h2>
                <p className="muted">
                  {item.description ||
                    (recipe
                      ? "A household favorite in the making."
                      : item.recipes.map((r) => r.name).join(" + "))}
                </p>
                <div className="card-actions">
                  <button
                    onClick={() =>
                      void action.run(async () => {
                        setView(
                          recipe
                            ? {
                                mealId: item.id,
                                name: item.name,
                                description: item.description,
                                recipes: [
                                  { ...item, recipeId: item.id },
                                ],
                              }
                            : await apiParsed(`/meals/${item.id}/snapshot`, parseSnapshot),
                        );
                      })
                    }
                  >
                    View
                  </button>
                  <button onClick={() => setEditing(structuredClone(item))}>
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
                          await api(
                            `/${kind}/${item.id}?version=${item.version}`,
                            "DELETE",
                          );
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
        <Editor
          key={`${kind}-${editing.id}`}
          recipeMode={recipeMode}
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
function Editor({
  recipeMode,
  initial,
  recipes,
  save,
  close,
}: {
  recipeMode: boolean;
  initial: Recipe | Meal;
  recipes: Recipe[];
  save: (v: Recipe | Meal) => Promise<void>;
  close: () => void;
}) {
  const [value, setValue] = useState(initial);
  const action = useAction();
  const r = isRecipe(value) ? value : blankRecipe();
  const m = isRecipe(value) ? blankMeal() : value;
  function ingredient(index: number, patch: Partial<Ingredient>) {
    setValue({
      ...r,
      ingredients: r.ingredients.map((x, i) =>
        i === index ? { ...x, ...patch } : x,
      ),
    });
  }
  return (
    <Modal
      title={`${value.id ? "Edit" : "New"} ${recipeMode ? "recipe" : "meal"}`}
      close={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(() => save(value));
        }}
      >
        <fieldset disabled={action.busy}>
          <label>
            Name
            <input
              required
              maxLength={120}
              value={value.name}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={4000}
              value={value.description}
              onChange={(e) =>
                setValue({ ...value, description: e.target.value })
              }
            />
          </label>
          {recipeMode ? (
            <>
              <label>
                Base servings
                <input
                  type="number"
                  required
                  min="0.01"
                  max="1000"
                  step="any"
                  value={r.servings}
                  onChange={(e) =>
                    setValue({ ...r, servings: Number(e.target.value) })
                  }
                />
              </label>
              <h3>Ingredients</h3>
              {r.ingredients.map((row, i) => (
                <div className="ingredient-row" key={i}>
                  <label>
                    Ingredient {i + 1}
                    <input
                      required
                      maxLength={120}
                      value={row.name}
                      onChange={(e) => ingredient(i, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      required={row.unit !== "unspecified"}
                      min="0.0001"
                      max="1000000"
                      step="any"
                      value={row.quantity ?? ""}
                      onChange={(e) =>
                        ingredient(i, {
                          quantity:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Unit
                    <select
                      value={row.unit}
                      onChange={(e) => ingredient(i, { unit: e.target.value })}
                    >
                      {units.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Note
                    <input
                      maxLength={500}
                      placeholder="e.g. finely chopped"
                      value={row.note}
                      onChange={(e) => ingredient(i, { note: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove ingredient ${i + 1}`}
                    disabled={r.ingredients.length === 1}
                    onClick={() =>
                      setValue({
                        ...r,
                        ingredients: r.ingredients.filter((_, j) => j !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setValue({
                    ...r,
                    ingredients: [...r.ingredients, blankIngredient()],
                  })
                }
              >
                <Plus size={16} />
                Add ingredient
              </button>
              <h3>Cooking steps</h3>
              {r.steps.map((step, i) => (
                <div className="step-row" key={i}>
                  <label>
                    Step {i + 1}
                    <textarea
                      required
                      maxLength={4000}
                      value={step}
                      onChange={(e) =>
                        setValue({
                          ...r,
                          steps: r.steps.map((s, j) =>
                            i === j ? e.target.value : s,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Move step ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => {
                      const steps = [...r.steps];
                      [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                      setValue({ ...r, steps });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove step ${i + 1}`}
                    disabled={r.steps.length === 1}
                    onClick={() =>
                      setValue({
                        ...r,
                        steps: r.steps.filter((_, j) => j !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setValue({ ...r, steps: [...r.steps, ""] })}
              >
                <Plus size={16} />
                Add step
              </button>
            </>
          ) : (
            <>
              <h3>Recipes in this meal</h3>
              <p className="muted">
                Choose recipes, then set how many servings to cook.
              </p>
              {!recipes.length && (
                <p>Add a recipe in your recipe book first.</p>
              )}
              {recipes.map((recipe) => {
                const selected = m.recipes.find(
                  (x) => x.recipeId === recipe.id,
                );
                return (
                  <div className="recipe-choice" key={recipe.id}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) =>
                          setValue({
                            ...m,
                            recipes: e.target.checked
                              ? [
                                  ...m.recipes,
                                  {
                                    recipeId: recipe.id,
                                    servings: recipe.servings,
                                  },
                                ]
                              : m.recipes.filter(
                                  (x) => x.recipeId !== recipe.id,
                                ),
                          })
                        }
                      />
                      {recipe.name}
                    </label>
                    {selected && (
                      <label>
                        Target servings
                        <input
                          aria-label={`Servings for ${recipe.name}`}
                          required
                          type="number"
                          min="0.01"
                          max="1000"
                          step="any"
                          value={selected.servings}
                          onChange={(e) =>
                            setValue({
                              ...m,
                              recipes: m.recipes.map((x) =>
                                x.recipeId === recipe.id
                                  ? { ...x, servings: Number(e.target.value) }
                                  : x,
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
          )}
          <ErrorBox error={action.error} />
          <div className="form-actions">
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={!recipeMode && !m.recipes.length}
            >
              {action.busy
                ? "Saving…"
                : `Save ${recipeMode ? "recipe" : "meal"}`}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

