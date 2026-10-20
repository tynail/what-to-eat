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
        api.MapGet("/plans", List);
        api.MapGet("/plans/{week}", Get);
        api.MapPut("/plans/{week}", Save);
        api.MapDelete("/plans/{id:int}", Delete);
    }

    static async Task<IResult> Generate(GenerateInput input, AppDb db)
    {
        var meals = await MealQueries.Full(db).ToListAsync();
        var ids = Planning.Select(meals.Select(meal => meal.Id).Except(input.ExcludedIds ?? []), input.Count);
        return Results.Ok(ids.Select(id => Planning.Snapshot(meals.Single(meal => meal.Id == id))));
    }

    static async Task<IResult> Reroll(RerollInput input, AppDb db)
    {
        if (input.SelectedIds is null || !input.SelectedIds.Contains(input.ReplaceId)) throw new ArgumentException("Meal must belong to current selection.");
        var meals = await MealQueries.Full(db).ToListAsync();
        var id = Planning.Select(meals.Select(meal => meal.Id).Except(input.SelectedIds).Except(input.ExcludedIds ?? []), 1)[0];
        return Results.Ok(Planning.Snapshot(meals.Single(meal => meal.Id == id)));
    }

    static async Task<IResult> List(AppDb db) => Results.Ok((await db.Plans.Where(plan => plan.HouseholdId == 1).Include(plan => plan.Entries).OrderByDescending(plan => plan.Week).ToListAsync()).Select(View));
    static async Task<IResult> Get(DateOnly week, AppDb db)
    {
        var plan = await db.Plans.Include(plan => plan.Entries).SingleOrDefaultAsync(plan => plan.Week == week && plan.HouseholdId == 1);
        return plan is null ? Results.NotFound() : Results.Ok(View(plan));
    }

    static async Task<IResult> Save(DateOnly week, SavePlanInput input, AppDb db)
    {
        ValidatePlan(week, input);
        var plan = await db.Plans.Include(item => item.Entries).SingleOrDefaultAsync(item => item.Week == week && item.HouseholdId == 1);
        if (plan is null)
        {
            if (input.Version is not null) throw new DbUpdateConcurrencyException();
            plan = new WeeklyPlan { Week = week };
            db.Plans.Add(plan);
        }
        else Versioning.RequireCurrent(plan, input.Version);

        plan.Entries.Clear();
        plan.Entries = input.Meals.Select((meal, position) => new SnapshotEntry { Position = position, Payload = JsonSerializer.Serialize(meal, Json) }).ToList();
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException exception) when (exception.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteErrorCode: 19 }) { throw new DbUpdateConcurrencyException(); }
        return Results.Ok(View(plan));
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

    static void ValidatePlan(DateOnly week, SavePlanInput input)
    {
        if (week.DayOfWeek != DayOfWeek.Monday) throw new ArgumentException("Week must start on Monday.");
        if (input.Meals is null || input.Meals.Count is < 1 or > 50 || input.Meals.Any(meal => meal is null) || input.Meals.Select(meal => meal.MealId).Distinct().Count() != input.Meals.Count)
            throw new ArgumentException("Choose 1–50 distinct meals.");
        foreach (var meal in input.Meals)
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
