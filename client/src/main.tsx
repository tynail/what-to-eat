import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Leaf,
  CalendarDays,
  BookOpen,
  Utensils,
  Settings as SettingsIcon,
  Shuffle,
  Plus,
  ArrowRight,
  LogOut,
} from "lucide-react";
import {
  api,
  resetCsrf,
  type Recipe,
  type Meal,
  type Snapshot,
  type Plan,
  type Me,
  type Ingredient,
} from "./api";
import "./style.css";
import { useAction } from "./shared/ui/action";
import { Empty, ErrorBox, Header } from "./shared/ui/page";
import { Settings } from "./features/settings/Settings";
import { Login } from "./features/access/Login";
import { blankIngredient, blankMeal, blankRecipe, units } from "./features/catalog/factories";
import { monday, pretty } from "./features/planning/dates";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
if (location.pathname === "/join")
  history.replaceState(null, "", location.pathname);
function isRecipe(value: Recipe | Meal): value is Recipe {
  return "ingredients" in value;
}
function App() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me") });
  if (location.pathname === "/join") return <Login join />;
  if (me.isPending)
    return (
      <p className="loading" role="status">
        Opening your kitchen…
      </p>
    );
  if (!me.data) return <Login />;
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span className="brand-icon">
            <Leaf />
          </span>
          <span>
            Weekly Table<small>A little less “what’s for dinner?”</small>
          </span>
        </a>
        <p className="nav-label">YOUR KITCHEN</p>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <CalendarDays />
            This Week
          </NavLink>
          <NavLink to="/meals">
            <Utensils />
            Meals
          </NavLink>
          <NavLink to="/recipes">
            <BookOpen />
            Recipes
          </NavLink>
          <NavLink to="/settings">
            <SettingsIcon />
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <Leaf />
          <p>
            Good food.
            <br />
            One less decision.
          </p>
          <small>Make room for the meals you love.</small>
        </div>
        <div className="account">
          <span className="avatar">
            {me.data.username.slice(0, 1).toUpperCase()}
          </span>
          <div>
            {me.data.username}
            <small>Our household</small>
          </div>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Planner />} />
          <Route path="/recipes" element={<Library kind="recipes" />} />
          <Route path="/meals" element={<Library kind="meals" />} />
          <Route path="/settings" element={<Settings me={me.data} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <footer>Made for your household. Shared around your table.</footer>
      </main>
    </div>
  );
}
function Library({ kind }: { kind: "recipes" | "meals" }) {
  const recipes = useQuery({
    queryKey: ["recipes"],
    queryFn: () => api<Recipe[]>("/recipes"),
  });
  const meals = useQuery({
    queryKey: ["meals"],
    queryFn: () => api<Meal[]>("/meals"),
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
                            : await api<Snapshot>(`/meals/${item.id}/snapshot`),
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
      {view && <Detail meal={view} close={() => setView(null)} />}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={close}>
          ×
        </button>
      </div>
      {children}
    </dialog>
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
  const r = value as Recipe;
  const m = value as Meal;
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
function Detail({ meal, close }: { meal: Snapshot; close: () => void }) {
  return (
    <Modal title={meal.name} close={close}>
      <p className="muted">{meal.description}</p>
      {meal.recipes.map((r, index) => (
        <section className="recipe-detail" key={index}>
          <p className="eyebrow">{r.servings} SERVINGS</p>
          <h3>{r.name}</h3>
          <p>{r.description}</p>
          <h4>Ingredients</h4>
          <ul>
            {r.ingredients.map((i, n) => (
              <li key={n}>
                {i.quantity == null ? "" : Number(i.quantity.toFixed(3))}{" "}
                {i.unit === "unspecified" ? "" : i.unit}{" "}
                <strong>{i.name}</strong>
                {i.note && ` — ${i.note}`}
              </li>
            ))}
          </ul>
          <h4>How to make it</h4>
          <ol>
            {r.steps.map((s, n) => (
              <li key={n}>{s}</li>
            ))}
          </ol>
        </section>
      ))}
    </Modal>
  );
}
function Planner() {
  const meals = useQuery({
    queryKey: ["meals"],
    queryFn: () => api<Meal[]>("/meals"),
  });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<Plan[]>("/plans"),
  });
  const qc = useQueryClient();
  const [week, setWeek] = useState(monday());
  const [count, setCount] = useState(5);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [draft, setDraft] = useState<Snapshot[] | null>(null);
  const [baseVersion, setBaseVersion] = useState<string | null>(null);
  const [view, setView] = useState<Snapshot | null>(null);
  const action = useAction();
  const saved = plans.data?.find((p) => p.week === week);
  const selection = draft ?? saved?.meals ?? [];
  function change(items: Snapshot[]) {
    if (draft === null) setBaseVersion(saved?.version || null);
    setDraft(items);
  }
  return (
    <>
      <Header
        eyebrow="A FRESH WEEK, A LITTLE LESS GUESSWORK"
        title="What’s on the table?"
        text="Your favorites, a little shuffle, and dinner is decided."
      />
      <section className="planner-hero">
        <div>
          <span className="pill">YOUR WEEK, SORTED</span>
          <h2>
            Good meals.
            <br />
            Less mental load.
          </h2>
          <p>
            Pick how many meals you need.
            <br />
            We’ll take care of the choosing.
          </p>
          <div className="hero-line">
            <Leaf size={18} />
            Made from your own recipe collection
          </div>
        </div>
        <div className="plate-art" aria-hidden="true">
          <div className="plate">
            <span>✦</span>
            <i />
            <b />
            <em />
          </div>
          <div className="art-caption">
            a little planning
            <br />
            <strong>a lot to look forward to</strong>
          </div>
        </div>
      </section>
      <section className="panel generator">
        <div className="section-title">
          <span className="icon-box">
            <Shuffle />
          </span>
          <div>
            <h2>Let’s make a plan</h2>
            <p className="muted">
              A fresh selection. No repeats within your week.
            </p>
          </div>
        </div>
        <div className="generate-controls">
          <label>
            Week starting
            <input
              type="date"
              value={week}
              onChange={(e) => {
                if (
                  e.target.value &&
                  (!draft || confirm("Discard unsaved selection?"))
                ) {
                  setWeek(monday(new Date(`${e.target.value}T12:00:00`)));
                  setDraft(null);
                  setBaseVersion(null);
                }
              }}
            />
          </label>
          <label>
            Number of meals
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <button
            className="primary"
            disabled={
              action.busy || meals.isPending || plans.isPending || !!plans.error
            }
            onClick={() =>
              void action.run(async () =>
                change(
                  await api<Snapshot[]>("/planner/generate", "POST", {
                    count,
                    excludedIds: excluded,
                  }),
                ),
              )
            }
          >
            <Shuffle size={18} />
            {action.busy ? "Working…" : "Pick my meals"}
          </button>
        </div>
        <details className="exclusions">
          <summary>
            Leave something out{" "}
            <span className="muted">({excluded.length} excluded)</span>
          </summary>
          <div className="checks">
            {meals.data?.map((m) => (
              <label className="check" key={m.id}>
                <input
                  type="checkbox"
                  checked={excluded.includes(m.id)}
                  onChange={(e) =>
                    setExcluded(
                      e.target.checked
                        ? [...excluded, m.id]
                        : excluded.filter((id) => id !== m.id),
                    )
                  }
                />
                {m.name}
              </label>
            ))}
          </div>
        </details>
        <ErrorBox error={action.error || meals.error || plans.error} />
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">WEEK OF {pretty(week).toUpperCase()}</p>
          <h2>
            Your weekly lineup <span className="count">{selection.length}</span>
          </h2>
        </div>
        <span className="pill">
          {draft
            ? "Unsaved preview"
            : saved
              ? "Saved plan"
              : "Ready when you are"}
        </span>
      </div>
      {!selection.length ? (
        <Empty
          title="A delicious week starts with a little shuffle"
          text={
            meals.data?.length
              ? "Choose your meal count above, then hit Pick my meals."
              : "First, add recipes and build a few meals in your collection."
          }
        />
      ) : (
        <div className="lineup">
          {selection.map((m, i) => (
            <article className="meal-row" key={`${m.mealId}-${i}`}>
              <span className="meal-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="meal-copy">
                <h3>{m.name}</h3>
                <p className="muted">
                  {m.recipes.map((r) => r.name).join(" + ")}
                </p>
              </div>
              <button onClick={() => setView(m)}>Cook this</button>
              <button
                aria-label={`Reroll ${m.name}`}
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const next = await api<Snapshot>(
                      "/planner/reroll",
                      "POST",
                      {
                        selectedIds: selection.map((s) => s.mealId),
                        excludedIds: excluded,
                        replaceId: m.mealId,
                      },
                    );
                    change(selection.map((s, n) => (n === i ? next : s)));
                  })
                }
              >
                <Shuffle size={16} />
              </button>
              <select
                aria-label={`Replace ${m.name}`}
                value=""
                disabled={action.busy}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id)
                    void action.run(async () => {
                      const next = await api<Snapshot>(`/meals/${id}/snapshot`);
                      change(selection.map((s, n) => (n === i ? next : s)));
                    });
                }}
              >
                <option value="">Replace…</option>
                {meals.data
                  ?.filter(
                    (x) =>
                      !selection.some((s) => s.mealId === x.id) &&
                      !excluded.includes(x.id),
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </article>
          ))}
        </div>
      )}
      {draft && (
        <div className="save-bar">
          <p>Looking good? Keep this week’s recipes exactly as they are.</p>
          <button
            className="primary"
            disabled={action.busy}
            onClick={() => {
              if (!saved || confirm("Replace this week’s saved plan?"))
                void action.run(async () => {
                  await api(`/plans/${week}`, "PUT", {
                    meals: draft,
                    version: baseVersion,
                  });
                  await qc.invalidateQueries({ queryKey: ["plans"] });
                  setDraft(null);
                  setBaseVersion(null);
                });
            }}
          >
            Save week <ArrowRight size={16} />
          </button>
          <button onClick={() => setDraft(null)}>Discard preview</button>
        </div>
      )}
      {saved && (
        <button
          className="text-button danger"
          disabled={action.busy}
          onClick={() => {
            if (confirm("Delete this saved week?"))
              void action.run(async () => {
                await api(
                  `/plans/${saved.id}?version=${saved.version}`,
                  "DELETE",
                );
                setDraft(null);
                await qc.invalidateQueries({ queryKey: ["plans"] });
              });
          }}
        >
          Delete saved week
        </button>
      )}
      <section className="past-weeks">
        <h2>Previously at your table</h2>
        {plans.data?.length ? (
          <div className="history-list">
            {plans.data.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (!draft || confirm("Discard unsaved selection?")) {
                    setWeek(p.week);
                    setDraft(null);
                  }
                }}
              >
                <CalendarDays size={18} />
                <span>{pretty(p.week)}</span>
                <small>{p.meals.length} meals</small>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Saved weeks will find a home here.</p>
        )}
      </section>
      {view && <Detail meal={view} close={() => setView(null)} />}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
