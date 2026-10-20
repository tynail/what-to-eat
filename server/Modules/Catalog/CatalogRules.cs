using Microsoft.EntityFrameworkCore;

namespace MealPlanner;

public static class CatalogRules
{
    static readonly HashSet<string> Units = ["count", "g", "kg", "oz", "lb", "ml", "l", "tsp", "tbsp", "cup", "unspecified"];

    public static void Text(string? value, int max, string field, bool required = false)
    {
        if (value is null || value.Length > max || (required && string.IsNullOrWhiteSpace(value)))
            throw new ArgumentException($"{field}: {(required ? "required, " : "")}maximum {max} characters.");
    }

    public static void Servings(decimal value)
    {
        if (value < 0.01m || value > 1000) throw new ArgumentException("Servings must be between 0.01 and 1000.");
    }

    public static void ValidateRecipe(RecipeInput input, bool snapshot = false)
    {
        Text(input.Name, 120, "Name", true); Text(input.Description, 4000, "Description"); Servings(input.Servings);
        if (input.Steps is null || input.Steps.Count is < 1 or > 100 || input.Ingredients is null || input.Ingredients.Count is < 1 or > 100)
            throw new ArgumentException("Provide 1–100 steps and ingredients.");
        foreach (var step in input.Steps) Text(step, 4000, "Step", true);
        foreach (var ingredient in input.Ingredients)
        {
            if (ingredient is null) throw new ArgumentException("Ingredient cannot be empty.");
            Text(ingredient.Name, 120, "Ingredient", true); Text(ingredient.Note, 500, "Note");
            if (!Units.Contains(ingredient.Unit) || (ingredient.Quantity is null && ingredient.Unit != "unspecified") || ingredient.Quantity is <= 0 || ingredient.Quantity > (snapshot ? 100000000000m : 1000000m))
                throw new ArgumentException("Ingredient needs a valid unit and positive quantity (optional for unspecified units).");
        }
    }

    public static async Task ValidateMeal(MealInput input, AppDb db)
    {
        Text(input.Name, 120, "Name", true); Text(input.Description, 4000, "Description");
        if (input.Recipes is null || input.Recipes.Count is < 1 or > 30 || input.Recipes.Any(recipe => recipe is null) || input.Recipes.Select(recipe => recipe.RecipeId).Distinct().Count() != input.Recipes.Count)
            throw new ArgumentException("Choose 1–30 distinct recipes.");
        foreach (var recipe in input.Recipes) Servings(recipe.Servings);
        var ids = input.Recipes.Select(recipe => recipe.RecipeId).ToList();
        if (await db.Recipes.CountAsync(recipe => recipe.HouseholdId == 1 && ids.Contains(recipe.Id)) != ids.Count)
            throw new ArgumentException("Recipe no longer available. Reload.");
    }

    public static void Apply(Recipe recipe, RecipeInput input)
    {
        recipe.Name = input.Name.Trim(); recipe.Description = input.Description.Trim(); recipe.Servings = input.Servings;
        recipe.Steps = input.Steps.Select(step => step.Trim()).ToList();
        recipe.Ingredients.Clear();
        recipe.Ingredients = input.Ingredients.Select((ingredient, position) => new Ingredient { Name = ingredient.Name.Trim(), Quantity = ingredient.Quantity, Unit = ingredient.Unit, Note = ingredient.Note.Trim(), Position = position }).ToList();
    }

    public static void Apply(Meal meal, MealInput input)
    {
        meal.Name = input.Name.Trim(); meal.Description = input.Description.Trim();
        meal.Recipes.Clear();
        meal.Recipes = input.Recipes.Select((recipe, position) => new MealRecipe { RecipeId = recipe.RecipeId, Servings = recipe.Servings, Position = position }).ToList();
    }
}

public static class Versioning
{
    public static void RequireCurrent(Owned entity, Guid? version)
    {
        if (version != entity.Version) throw new DbUpdateConcurrencyException();
        entity.Version = Guid.NewGuid();
    }
}
