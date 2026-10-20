using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MealPlanner;

public static class AccessEndpoints
{
    static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    static void Check(IdentityResult result)
    {
        if (!result.Succeeded) throw new ArgumentException(string.Join(" ", result.Errors.Select(x => x.Description)));
    }

    public static void MapAccess(this WebApplication app)
    {
        app.MapPost("/api/auth/login", async (LoginInput input, UserManager<User> users, SignInManager<User> signIn) =>
        {
            if (string.IsNullOrWhiteSpace(input.Username) || input.Username.Length > 80 || string.IsNullOrEmpty(input.Password) || input.Password.Length > 1024)
                throw new ArgumentException("Username and password required.");

            var user = await users.FindByNameAsync(input.Username);
            if (user is null || user.Disabled || user.HouseholdId != 1)
                return Results.Problem(statusCode: 401, detail: "Invalid login or account unavailable.");

            var result = await signIn.PasswordSignInAsync(user, input.Password, false, true);
            return result.Succeeded ? Results.Ok() : Results.Problem(statusCode: 401, detail: "Invalid login or account unavailable.");
        }).RequireRateLimiting("auth");

        app.MapGet("/api/auth/me", async (ClaimsPrincipal principal, UserManager<User> users) =>
        {
            var user = (await users.GetUserAsync(principal))!;
            return Results.Ok(new { user.Id, username = user.UserName, isAdmin = principal.IsInRole("Admin") });
        }).RequireAuthorization();

        app.MapPost("/api/auth/logout", async (SignInManager<User> signIn) => { await signIn.SignOutAsync(); return Results.NoContent(); }).RequireAuthorization();
        app.MapPost("/api/auth/redeem", Redeem).RequireRateLimiting("auth");

        var admin = app.MapGroup("/api/admin").RequireAuthorization(policy => policy.RequireRole("Admin"));
        admin.MapGet("/users", async (AppDb db) => await db.Users.Where(user => user.HouseholdId == 1).Select(user => new { user.Id, username = user.UserName, user.Disabled }).ToListAsync());
        admin.MapPost("/invites", async (AppDb db) => await Issue(db, "invite", null));
        admin.MapPost("/users/{id}/reset", async (string id, AppDb db) =>
            await db.Users.AnyAsync(user => user.Id == id && user.HouseholdId == 1 && !user.Disabled) ? await Issue(db, "reset", id) : Results.NotFound());
        admin.MapPost("/users/{id}/toggle", Toggle);
    }

    static async Task<IResult> Redeem(RedeemInput input, AppDb db, UserManager<User> users)
    {
        if (string.IsNullOrEmpty(input.Password) || input.Password.Length > 1024)
            throw new ArgumentException("Password required, maximum 1024 characters.");
        if (string.IsNullOrWhiteSpace(input.Token) || input.Token.Length > 200)
            return Results.Problem(statusCode: 400, detail: "Invalid or expired link.");

        await using var transaction = await db.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        var token = await db.AccessTokens.SingleOrDefaultAsync(item => item.Hash == Hash(input.Token) && item.UsedAt == null && item.ExpiresAt > now);
        if (token is null) return Results.Problem(statusCode: 400, detail: "Invalid or expired link.");
        if (await db.AccessTokens.Where(item => item.Id == token.Id && item.UsedAt == null).ExecuteUpdateAsync(setter => setter.SetProperty(item => item.UsedAt, now)) != 1)
            return Results.Problem(statusCode: 400, detail: "Invalid or expired link.");

        if (token.Kind == "invite")
        {
            if (string.IsNullOrWhiteSpace(input.Username) || input.Username.Length > 80) throw new ArgumentException("Username must be 1–80 characters.");
            var user = new User { UserName = input.Username.Trim(), HouseholdId = token.HouseholdId };
            Check(await users.CreateAsync(user, input.Password));
            Check(await users.AddToRoleAsync(user, "Member"));
        }
        else if (token.Kind == "reset")
        {
            var user = await users.FindByIdAsync(token.UserId!);
            if (user is null || user.Disabled) return Results.Problem(statusCode: 400, detail: "Invalid or expired link.");
            Check(await users.ResetPasswordAsync(user, await users.GeneratePasswordResetTokenAsync(user), input.Password));
            await users.SetLockoutEndDateAsync(user, null);
            await users.ResetAccessFailedCountAsync(user);
        }
        else return Results.Problem(statusCode: 400, detail: "Invalid or expired link.");

        await transaction.CommitAsync();
        return Results.Ok();
    }

    static async Task<IResult> Toggle(string id, ClaimsPrincipal principal, UserManager<User> users)
    {
        if (id == users.GetUserId(principal)) return Results.Problem(statusCode: 400, detail: "Cannot disable your own account.");
        var user = await users.FindByIdAsync(id);
        if (user is null || user.HouseholdId != 1) return Results.NotFound();
        if (await users.IsInRoleAsync(user, "Admin")) return Results.Problem(statusCode: 400, detail: "Admin accounts cannot be disabled here.");
        user.Disabled = !user.Disabled;
        Check(await users.UpdateAsync(user));
        Check(await users.UpdateSecurityStampAsync(user));
        return Results.NoContent();
    }

    static async Task<IResult> Issue(AppDb db, string kind, string? userId)
    {
        var raw = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var expiry = DateTime.UtcNow.AddHours(kind == "invite" ? 48 : 1);
        await using var transaction = await db.Database.BeginTransactionAsync();
        if (userId is not null)
            await db.AccessTokens.Where(token => token.UserId == userId && token.UsedAt == null).ExecuteUpdateAsync(setter => setter.SetProperty(token => token.UsedAt, DateTime.UtcNow));
        db.AccessTokens.Add(new() { Hash = Hash(raw), Kind = kind, UserId = userId, ExpiresAt = expiry });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Results.Ok(new { path = $"/join#{kind}:{raw}", expiresAt = expiry });
    }
}
