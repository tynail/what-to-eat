using Microsoft.EntityFrameworkCore;

namespace MealPlanner;

public static class CatalogEndpoints
{
    public static void MapCatalog(this WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization(policy => policy.RequireAssertion(context => context.User.IsInRole("Admin") || context.User.IsInRole("Member")));
        api.MapGet("/recipes", async (AppDb db) => await db.Recipes.Where(recipe => recipe.HouseholdId == 1).Include(recipe => recipe.Ingredients.OrderBy(ingredient => ingredient.Position)).OrderBy(recipe => recipe.Name).ToListAsync());
        api.MapGet("/recipes/{id:int}", GetRecipe).Produces<Recipe>();
        api.MapPost("/recipes", CreateRecipe);
        api.MapPut("/recipes/{id:int}", UpdateRecipe);
        api.MapDelete("/recipes/{id:int}", DeleteRecipe);

        api.MapGet("/meals", ListMeals);
        api.MapGet("/meals/{id:int}", GetMeal);
        api.MapPost("/meals", CreateMeal);
        api.MapPut("/meals/{id:int}", UpdateMeal);
        api.MapDelete("/meals/{id:int}", DeleteMeal);
        api.MapGet("/meals/{id:int}/snapshot", GetSnapshot);
    }

    static async Task<IResult> GetRecipe(int id, AppDb db)
    {
        var recipe = await db.Recipes.Include(recipe => recipe.Ingredients.OrderBy(ingredient => ingredient.Position)).SingleOrDefaultAsync(recipe => recipe.Id == id && recipe.HouseholdId == 1);
        return recipe is null ? Results.NotFound() : Results.Ok(recipe);
    }

    static async Task<IResult> CreateRecipe(RecipeInput input, AppDb db)
    {
        CatalogRules.ValidateRecipe(input);
        var recipe = new Recipe();
        CatalogRules.Apply(recipe, input);
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return Results.Created($"/api/recipes/{recipe.Id}", recipe);
    }

    static async Task<IResult> UpdateRecipe(int id, RecipeInput input, AppDb db)
    {
        CatalogRules.ValidateRecipe(input);
        var recipe = await db.Recipes.Include(recipe => recipe.Ingredients).SingleOrDefaultAsync(recipe => recipe.Id == id && recipe.HouseholdId == 1);
        if (recipe is null) return Results.NotFound();
        Versioning.RequireCurrent(recipe, input.Version);
        CatalogRules.Apply(recipe, input);
        await db.SaveChangesAsync();
        return Results.Ok(recipe);
    }

    static async Task<IResult> DeleteRecipe(int id, Guid version, AppDb db)
    {
        var recipe = await db.Recipes.SingleOrDefaultAsync(recipe => recipe.Id == id && recipe.HouseholdId == 1);
        if (recipe is null) return Results.NotFound();
        Versioning.RequireCurrent(recipe, version);
        var meals = await db.Meals.Where(meal => meal.Recipes.Any(link => link.RecipeId == id)).Select(meal => meal.Name).ToListAsync();
        if (meals.Count != 0) return Results.Problem(statusCode: 409, detail: "Remove recipe from these meals first: " + string.Join(", ", meals));
        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    static async Task<IResult> ListMeals(AppDb db) => Results.Ok((await MealQueries.Summaries(db)).OrderBy(meal => meal.Name));
    static async Task<IResult> GetMeal(int id, AppDb db)
    {
        var meal = (await MealQueries.Summaries(db)).SingleOrDefault(meal => meal.Id == id);
        return meal is null ? Results.NotFound() : Results.Ok(meal);
    }

    static async Task<IResult> CreateMeal(MealInput input, AppDb db)
    {
        await CatalogRules.ValidateMeal(input, db);
        var meal = new Meal();
        CatalogRules.Apply(meal, input);
        db.Meals.Add(meal);
        await db.SaveChangesAsync();
        return Results.Created($"/api/meals/{meal.Id}", new { meal.Id });
    }

    static async Task<IResult> UpdateMeal(int id, MealInput input, AppDb db)
    {
        await CatalogRules.ValidateMeal(input, db);
        var meal = await db.Meals.Include(meal => meal.Recipes).SingleOrDefaultAsync(meal => meal.Id == id && meal.HouseholdId == 1);
        if (meal is null) return Results.NotFound();
        Versioning.RequireCurrent(meal, input.Version);
        CatalogRules.Apply(meal, input);
        await db.SaveChangesAsync();
        return Results.Ok(new { meal.Id });
    }

    static async Task<IResult> DeleteMeal(int id, Guid version, AppDb db)
    {
        var meal = await db.Meals.SingleOrDefaultAsync(meal => meal.Id == id && meal.HouseholdId == 1);
        if (meal is null) return Results.NotFound();
        Versioning.RequireCurrent(meal, version);
        db.Meals.Remove(meal);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    static async Task<IResult> GetSnapshot(int id, AppDb db)
    {
        var meal = await MealQueries.Full(db).SingleOrDefaultAsync(meal => meal.Id == id);
        return meal is null ? Results.NotFound() : Results.Ok(Planning.Snapshot(meal));
    }
}

public static class MealQueries
{
    public static IQueryable<Meal> Full(AppDb db) => db.Meals.Where(meal => meal.HouseholdId == 1).Include(meal => meal.Recipes).ThenInclude(link => link.Recipe).ThenInclude(recipe => recipe.Ingredients);
    public static async Task<List<MealSummary>> Summaries(AppDb db)
    {
        var meals = await db.Meals.Where(meal => meal.HouseholdId == 1)
            .Include(meal => meal.Recipes)
            .ThenInclude(link => link.Recipe)
            .ToListAsync();

        return meals.Select(meal => new MealSummary(
            meal.Id,
            meal.Name,
            meal.Description,
            meal.Version,
            meal.Recipes.OrderBy(link => link.Position)
                .Select(link => new MealRecipeSummary(link.RecipeId, link.Servings, link.Recipe.Name))
                .ToList()))
            .ToList();
    }
}

public sealed record MealRecipeSummary(int RecipeId, decimal Servings, string Name);
public sealed record MealSummary(int Id, string Name, string Description, Guid Version, List<MealRecipeSummary> Recipes);
