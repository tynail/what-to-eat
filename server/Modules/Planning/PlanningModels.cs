namespace MealPlanner;

public class WeeklyPlan : Owned { public DateOnly Week { get; set; } public List<SnapshotEntry> Entries { get; set; } = []; }
public class SnapshotEntry { public int Id { get; set; } public int WeeklyPlanId { get; set; } public int Position { get; set; } public int SchemaVersion { get; set; } = 1; public string Payload { get; set; } = ""; }
public sealed record GenerateInput(int Count, List<int> ExcludedIds);
public sealed record RerollInput(List<int> SelectedIds, List<int> ExcludedIds, int ReplaceId);
public sealed record SavePlanInput(List<MealSnapshot>? Meals, Guid? Version, List<MealReference>? References = null);
public sealed record MealReference(int MealId, string? PreviewKey);

public class MealPreview
{
    public required string Key { get; set; }
    public int MealId { get; set; }
    public required string Payload { get; set; }
    public DateTime ExpiresAt { get; set; }
}
public sealed record IngredientSnapshot(string Name, decimal? Quantity, string Unit, string Note);
public sealed record RecipeSnapshot(int RecipeId, string Name, string Description, decimal Servings, List<string> Steps, List<IngredientSnapshot> Ingredients);
public sealed record MealSnapshot(int MealId, string Name, string Description, List<RecipeSnapshot> Recipes)
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public string? PreviewKey { get; init; }
}
