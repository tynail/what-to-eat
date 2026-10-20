namespace MealPlanner;

public static class Planning
{
    public static List<int> Select(IEnumerable<int> candidates, int count)
    {
        var ids = candidates.Distinct().ToList();
        if (count < 1 || count > 50) throw new ArgumentException("Choose between 1 and 50 meals.");
        if (ids.Count < count) throw new ArgumentException($"Only {ids.Count} eligible meals available; requested {count}.");
        for (var index = ids.Count - 1; index > 0; index--)
        {
            var random = System.Security.Cryptography.RandomNumberGenerator.GetInt32(index + 1);
            (ids[index], ids[random]) = (ids[random], ids[index]);
        }
        return ids.Take(count).ToList();
    }

    public static MealSnapshot Snapshot(Meal meal) => new(meal.Id, meal.Name, meal.Description,
        meal.Recipes.OrderBy(link => link.Position).Select(link => new RecipeSnapshot(link.RecipeId, link.Recipe.Name, link.Recipe.Description, link.Servings,
            link.Recipe.Steps.ToList(), link.Recipe.Ingredients.OrderBy(ingredient => ingredient.Position)
                .Select(ingredient => new IngredientSnapshot(ingredient.Name, ingredient.Quantity * link.Servings / link.Recipe.Servings, ingredient.Unit, ingredient.Note)).ToList())).ToList());
}
