using Microsoft.AspNetCore.Identity;

namespace MealPlanner;

public class Household { public int Id { get; set; } = 1; public string Name { get; set; } = "Our kitchen"; }
public class User : IdentityUser { public int HouseholdId { get; set; } = 1; public bool Disabled { get; set; } }
public class AccessToken { public int Id { get; set; } public string Hash { get; set; } = ""; public string Kind { get; set; } = "invite"; public string? UserId { get; set; } public int HouseholdId { get; set; } = 1; public DateTime ExpiresAt { get; set; } public DateTime? UsedAt { get; set; } }
public sealed record LoginInput(string Username, string Password);
public sealed record RedeemInput(string Token, string Username, string Password);
