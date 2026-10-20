using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner;

public class AppDb(DbContextOptions<AppDb> options) : IdentityDbContext<User>(options)
{
    public DbSet<Household> Households => Set<Household>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<Meal> Meals => Set<Meal>();
    public DbSet<WeeklyPlan> Plans => Set<WeeklyPlan>();
    public DbSet<AccessToken> AccessTokens => Set<AccessToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<User>().HasOne<Household>().WithMany().HasForeignKey(user => user.HouseholdId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Recipe>().Property(recipe => recipe.Steps).HasConversion(value => System.Text.Json.JsonSerializer.Serialize(value, (System.Text.Json.JsonSerializerOptions?)null), value => System.Text.Json.JsonSerializer.Deserialize<List<string>>(value, (System.Text.Json.JsonSerializerOptions?)null)!);
        builder.Entity<Recipe>().Property(recipe => recipe.Steps).Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>((left, right) => left!.SequenceEqual(right!), value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())), value => value.ToList()));
        builder.Entity<MealRecipe>().HasOne(link => link.Recipe).WithMany().HasForeignKey(link => link.RecipeId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<WeeklyPlan>().HasIndex(plan => new { plan.HouseholdId, plan.Week }).IsUnique();
        builder.Entity<AccessToken>().HasIndex(token => token.Hash).IsUnique();
    }
}
