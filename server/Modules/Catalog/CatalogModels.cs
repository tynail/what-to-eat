using System.ComponentModel.DataAnnotations;

namespace MealPlanner;

public abstract class Owned { public int Id { get; set; } public int HouseholdId { get; set; } = 1; [ConcurrencyCheck] public Guid Version { get; set; } = Guid.NewGuid(); }
public class Recipe : Owned { public string Name { get; set; } = ""; public string Description { get; set; } = ""; public decimal Servings { get; set; } = 2; public List<string> Steps { get; set; } = []; public List<Ingredient> Ingredients { get; set; } = []; }
public class Ingredient { public int Id { get; set; } public int RecipeId { get; set; } public string Name { get; set; } = ""; public decimal? Quantity { get; set; } public string Unit { get; set; } = "count"; public string Note { get; set; } = ""; public int Position { get; set; } }
public class Meal : Owned { public string Name { get; set; } = ""; public string Description { get; set; } = ""; public List<MealRecipe> Recipes { get; set; } = []; }
public class MealRecipe { public int Id { get; set; } public int MealId { get; set; } public int RecipeId { get; set; } public Recipe Recipe { get; set; } = null!; public decimal Servings { get; set; } = 2; public int Position { get; set; } }
public sealed record IngredientInput(string Name, decimal? Quantity, string Unit, string Note);
public sealed record RecipeInput(string Name, string Description, decimal Servings, List<string> Steps, List<IngredientInput> Ingredients, Guid? Version);
public sealed record MealRecipeInput(int RecipeId, decimal Servings);
public sealed record MealInput(string Name, string Description, List<MealRecipeInput> Recipes, Guid? Version);
