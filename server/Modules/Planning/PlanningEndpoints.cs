using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace MealPlanner;

public static class PlanningEndpoints
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void MapPlanning(this WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization(policy => policy.RequireAssertion(context => context.User.IsInRole("Admin") || context.User.IsInRole("Member")));
        api.MapPost("/planner/generate", Generate);
        api.MapPost("/planner/reroll", Reroll);
        api.MapPost("/planner/preview/{id:int}", Preview);
        api.MapGet("/plans", List);
        api.MapGet("/plans/{week}", Get);
        api.MapPut("/plans/{week}", Save);
        api.MapDelete("/plans/{id:int}", Delete);
    }

    static async Task<List<int>> SelectIds(AppDb db, IEnumerable<int> excluded, int count)
    {
        var candidates = await MealQueries.Ids(db).ToListAsync();
        return Planning.Select(candidates.Except(excluded), count);
    }

    static async Task<IResult> Generate(GenerateInput input, AppDb db, TimeProvider clock)
    {
        var ids = await SelectIds(db, input.ExcludedIds ?? [], input.Count);
        return Results.Ok(await PlanPreviews.Create(db, ids, clock));
    }

    static async Task<IResult> Reroll(RerollInput input, AppDb db, TimeProvider clock)
    {
        if (input.SelectedIds is null || !input.SelectedIds.Contains(input.ReplaceId)) throw new ArgumentException("Meal must belong to current selection.");
        var ids = await SelectIds(db, input.SelectedIds.Concat(input.ExcludedIds ?? []), 1);
        return Results.Ok((await PlanPreviews.Create(db, ids, clock))[0]);
    }

    static async Task<IResult> Preview(int id, AppDb db, TimeProvider clock)
    {
        if (!await MealQueries.Ids(db).ContainsAsync(id)) return Results.NotFound();
        return Results.Ok((await PlanPreviews.Create(db, [id], clock))[0]);
    }

    static async Task<IResult> List(DateOnly? before, AppDb db)
    {
        const int pageSize = 20;
        var query = db.Plans.AsNoTracking().Where(plan => plan.HouseholdId == 1);
        if (before.HasValue) query = query.Where(plan => plan.Week < before.Value);
        var rows = await query.OrderByDescending(plan => plan.Week).Take(pageSize + 1)
            .Select(plan => new { plan.Week, mealCount = plan.Entries.Count }).ToListAsync();
        return Results.Ok(new { items = rows.Take(pageSize), nextBefore = rows.Count > pageSize ? rows[pageSize - 1].Week : (DateOnly?)null });
    }

    static async Task<IResult> Get(DateOnly week, AppDb db)
    {
        var plan = await db.Plans.Include(plan => plan.Entries).SingleOrDefaultAsync(plan => plan.Week == week && plan.HouseholdId == 1);
        return plan is null ? Results.NotFound() : Results.Ok(View(plan));
    }

    static async Task<IResult> Save(DateOnly week, SavePlanInput input, AppDb db, TimeProvider clock)
    {
        if (week.DayOfWeek != DayOfWeek.Monday) throw new ArgumentException("Week must start on Monday.");
        var plan = await db.Plans.Include(item => item.Entries).SingleOrDefaultAsync(item => item.Week == week && item.HouseholdId == 1);
        if (plan is null)
        {
            if (input.Version is not null) throw new DbUpdateConcurrencyException();
            plan = new WeeklyPlan { Week = week };
            db.Plans.Add(plan);
        }
        else Versioning.RequireCurrent(plan, input.Version);

        List<string> payloads;
        if (input.References is { } references)
        {
            if (input.Meals is not null || references.Count is < 1 or > 50 || references.Any(item => item is null)
                || references.Select(item => item.MealId).Distinct().Count() != references.Count)
                throw new ArgumentException("Choose 1–50 distinct meal references.");

            var resolved = await PlanPreviews.Resolve(db, references, plan.Entries, clock.GetUtcNow().UtcDateTime);
            if (resolved is null) return Results.Problem(statusCode: 409, detail: "Preview unavailable. Generate a new preview and retry.");
            payloads = resolved;
        }
        else
        {
            ValidateMeals(input.Meals);
            payloads = input.Meals!.Select(meal => JsonSerializer.Serialize(meal with { PreviewKey = null }, Json)).ToList();
        }
        plan.Entries.Clear();
        plan.Entries = payloads.Select((payload, position) => new SnapshotEntry { Position = position, Payload = payload }).ToList();
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException exception) when (exception.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteErrorCode: 19 }) { throw new DbUpdateConcurrencyException(); }
        return input.References is null ? Results.Ok(View(plan)) : Results.NoContent();
    }

    static async Task<IResult> Delete(int id, Guid version, AppDb db)
    {
        var plan = await db.Plans.SingleOrDefaultAsync(item => item.Id == id && item.HouseholdId == 1);
        if (plan is null) return Results.NotFound();
        Versioning.RequireCurrent(plan, version);
        db.Plans.Remove(plan);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    static object View(WeeklyPlan plan) => new { plan.Id, plan.Week, plan.Version, meals = plan.Entries.OrderBy(entry => entry.Position).Select(entry => JsonSerializer.Deserialize<MealSnapshot>(entry.Payload, Json)) };

    static void ValidateMeals(List<MealSnapshot>? meals)
    {
        if (meals is null || meals.Count is < 1 or > 50 || meals.Any(meal => meal is null) || meals.Select(meal => meal.MealId).Distinct().Count() != meals.Count)
            throw new ArgumentException("Choose 1–50 distinct meals.");
        foreach (var meal in meals)
        {
            CatalogRules.Text(meal.Name, 120, "Meal name", true); CatalogRules.Text(meal.Description, 4000, "Meal description");
            if (meal.Recipes is null || meal.Recipes.Count is < 1 or > 30) throw new ArgumentException("Meal requires 1–30 recipes.");
            foreach (var recipe in meal.Recipes)
            {
                if (recipe is null || recipe.Ingredients is null || recipe.Ingredients.Any(ingredient => ingredient is null)) throw new ArgumentException("Recipe and ingredients required.");
                CatalogRules.ValidateRecipe(new RecipeInput(recipe.Name, recipe.Description, recipe.Servings, recipe.Steps, recipe.Ingredients.Select(ingredient => new IngredientInput(ingredient.Name, ingredient.Quantity, ingredient.Unit, ingredient.Note)).ToList(), null), true);
            }
        }
    }
}
