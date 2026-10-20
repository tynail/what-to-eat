using MealPlanner;
using Xunit;
namespace MealPlanner.Tests;

public class PlanningTests
{
    [Fact] public void SelectionIsUniqueAndRespectsExclusions() { for (var i = 0; i < 100; i++) { var selected = Planning.Select(Enumerable.Range(1, 10).Except([2, 5]), 8); Assert.Equal(8, selected.Distinct().Count()); Assert.DoesNotContain(2, selected); Assert.DoesNotContain(5, selected); } }
    [Fact] public void InsufficientMealsNeverSilentlyReducesCount() { Assert.Throws<ArgumentException>(() => Planning.Select([1, 2], 3)); Assert.Throws<ArgumentException>(() => Planning.Select([1], 0)); }
    [Fact] public void RerollExcludesCurrentSelection() { Assert.Equal(4, Planning.Select(new[] { 1, 2, 3, 4, 5 }.Except([1, 2, 3]).Except([5]), 1)[0]); }
    [Fact]
    public void SnapshotScalesWithoutChangingRecipe()
    {
        var recipe = new Recipe { Id = 7, Name = "Soup", Servings = 2, Steps = ["Simmer"], Ingredients = [new() { Name = "Water", Quantity = 500, Unit = "ml" }, new() { Name = "Salt", Quantity = null, Unit = "unspecified" }] };
        var snapshot = Planning.Snapshot(new() { Id = 1, Name = "Lunch", Recipes = [new() { RecipeId = 7, Recipe = recipe, Servings = 3 }] });
        Assert.Equal(750, snapshot.Recipes[0].Ingredients[0].Quantity); Assert.Null(snapshot.Recipes[0].Ingredients[1].Quantity); Assert.Equal(500, recipe.Ingredients[0].Quantity);
        recipe.Steps[0] = "Changed"; Assert.Equal("Simmer", snapshot.Recipes[0].Steps[0]);
    }
}
