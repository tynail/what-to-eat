using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MealPlanner;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MealPlanner.Tests;

public class KitchenFactory : WebApplicationFactory<Program>
{
    public string DataPath { get; } = Path.Combine(Path.GetTempPath(), "mealplanner-tests-" + Guid.NewGuid());
    protected override void ConfigureWebHost(IWebHostBuilder builder) { builder.UseEnvironment("Development"); builder.UseSetting("DataDirectory", DataPath); }
    public async Task<HttpClient> Login(bool admin = true)
    {
        var client = CreateClient(new() { AllowAutoRedirect = false });
        using var scope = Services.CreateScope(); var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var name = "user" + Guid.NewGuid().ToString("N"); var user = new User { UserName = name };
        Assert.True((await users.CreateAsync(user, "Testing!Password42")).Succeeded); Assert.True((await users.AddToRoleAsync(user, admin ? "Admin" : "Member")).Succeeded);
        await Csrf(client); var response = await client.PostAsJsonAsync("/api/auth/login", new { username = name, password = "Testing!Password42" }); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await Csrf(client); return client;
    }
    public static async Task Csrf(HttpClient c) { c.DefaultRequestHeaders.Remove("X-CSRF-TOKEN"); var token = await c.GetFromJsonAsync<JsonElement>("/api/auth/csrf"); c.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString()); }
    protected override void Dispose(bool disposing) { base.Dispose(disposing); Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools(); if (Directory.Exists(DataPath)) Directory.Delete(DataPath, true); }
}
public class ApiTests
{
    static RecipeInput Recipe(string name = "Soup", Guid? version = null) => new(name, "Warm dinner", 2, ["Simmer gently"], [new("Water", 500, "ml", "")], version);
    [Fact]
    public async Task AuthenticationCsrfAndRolesAreRequired()
    {
        using var f = new KitchenFactory(); using var anonymous = f.CreateClient(); Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/recipes")).StatusCode);
        using var member = await f.Login(false); member.DefaultRequestHeaders.Remove("X-CSRF-TOKEN"); Assert.Equal(HttpStatusCode.BadRequest, (await member.PostAsJsonAsync("/api/recipes", Recipe())).StatusCode);
        await KitchenFactory.Csrf(member); Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsync("/api/admin/invites", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.GetAsync("/openapi/v1.json")).StatusCode);
    }
    [Fact]
    public async Task CrudConflictsReferenceProtectionAndSnapshotHistory()
    {
        using var f = new KitchenFactory(); using var c = await f.Login();
        var created = await c.PostAsJsonAsync("/api/recipes", Recipe()); created.EnsureSuccessStatusCode(); var r = (await created.Content.ReadFromJsonAsync<MealPlanner.Recipe>())!;
        var mealResponse = await c.PostAsJsonAsync("/api/meals", new MealInput("Soup night", "", [new(r.Id, 4)], null)); mealResponse.EnsureSuccessStatusCode();
        var mealId = (await mealResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Conflict, (await c.DeleteAsync($"/api/recipes/{r.Id}?version={r.Version}")).StatusCode);
        var generated = await c.PostAsJsonAsync("/api/planner/generate", new GenerateInput(1, [])); generated.EnsureSuccessStatusCode(); var snapshots = (await generated.Content.ReadFromJsonAsync<List<MealSnapshot>>())!;
        Assert.Equal(1000, snapshots[0].Recipes[0].Ingredients[0].Quantity);
        var saved = await c.PutAsJsonAsync("/api/plans/2026-09-07", new SavePlanInput(snapshots, null)); saved.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await c.PutAsJsonAsync("/api/plans/2026-09-07", new SavePlanInput(snapshots, null))).StatusCode);
        (await c.PutAsJsonAsync($"/api/recipes/{r.Id}", Recipe("Changed", r.Version))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await c.PutAsJsonAsync($"/api/recipes/{r.Id}", Recipe("Stale", r.Version))).StatusCode);
        var meals = await c.GetFromJsonAsync<JsonElement>("/api/meals"); var mv = meals[0].GetProperty("version").GetString(); (await c.DeleteAsync($"/api/meals/{mealId}?version={mv}")).EnsureSuccessStatusCode();
        var recipes = (await c.GetFromJsonAsync<List<MealPlanner.Recipe>>("/api/recipes"))!; (await c.DeleteAsync($"/api/recipes/{r.Id}?version={recipes[0].Version}")).EnsureSuccessStatusCode();
        var plans = await c.GetFromJsonAsync<JsonElement>("/api/plans"); Assert.Equal("Soup", plans[0].GetProperty("meals")[0].GetProperty("recipes")[0].GetProperty("name").GetString());
        (await c.DeleteAsync($"/api/plans/{plans[0].GetProperty("id")}?version={plans[0].GetProperty("version").GetString()}")).EnsureSuccessStatusCode();
        Assert.Equal(0, (await c.GetFromJsonAsync<JsonElement>("/api/plans")).GetArrayLength());
    }
    [Fact]
    public async Task InviteAndResetAreSingleUseAndExpire()
    {
        using var f = new KitchenFactory(); using var admin = await f.Login(); using var guest = f.CreateClient(); await KitchenFactory.Csrf(guest);
        async Task<string> Issue(string path) { var res = await admin.PostAsync(path, null); res.EnsureSuccessStatusCode(); return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("path").GetString()!.Split(':')[1]; }
        var token = await Issue("/api/admin/invites"); var input = new RedeemInput(token, "newmember", "Testing!Password42");
        (await guest.PostAsJsonAsync("/api/auth/redeem", input)).EnsureSuccessStatusCode(); Assert.Equal(HttpStatusCode.BadRequest, (await guest.PostAsJsonAsync("/api/auth/redeem", input)).StatusCode);
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDb>(); var user = await db.Users.SingleAsync(u => u.UserName == "newmember");
        var reset = await Issue($"/api/admin/users/{user.Id}/reset"); var resetInput = new RedeemInput(reset, "", "Changed!Password42");
        (await guest.PostAsJsonAsync("/api/auth/redeem", resetInput)).EnsureSuccessStatusCode(); Assert.Equal(HttpStatusCode.BadRequest, (await guest.PostAsJsonAsync("/api/auth/redeem", resetInput)).StatusCode);
        var expired = await Issue("/api/admin/invites"); await db.AccessTokens.Where(t => t.UsedAt == null).ExecuteUpdateAsync(s => s.SetProperty(t => t.ExpiresAt, DateTime.UtcNow.AddMinutes(-1)));
        Assert.Equal(HttpStatusCode.BadRequest, (await guest.PostAsJsonAsync("/api/auth/redeem", new RedeemInput(expired, "expired", "Testing!Password42"))).StatusCode);
    }

    [Fact]
    public async Task UnknownAccessTokenKindsFailClosed()
    {
        using var f = new KitchenFactory(); using var admin = await f.Login(); using var guest = f.CreateClient(); await KitchenFactory.Csrf(guest);
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        var raw = "unknown-kind-token";
        db.AccessTokens.Add(new AccessToken { Hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw))), Kind = "unexpected", ExpiresAt = DateTime.UtcNow.AddHours(1) });
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await guest.PostAsJsonAsync("/api/auth/redeem", new RedeemInput(raw, "", "Testing!Password42"))).StatusCode);
    }
    [Fact]
    public async Task InvalidInputsAndImpossibleSelectionsAreRejected()
    {
        using var f = new KitchenFactory(); using var c = await f.Login();
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsJsonAsync("/api/recipes", Recipe() with { Servings = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsJsonAsync("/api/planner/generate", new GenerateInput(5, []))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PutAsJsonAsync("/api/plans/2026-09-08", new SavePlanInput([], null))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsJsonAsync("/api/meals", new MealInput("Missing", "", [new(9999, 2)], null))).StatusCode);
    }
    [Fact]
    public async Task DisabledMemberLosesExistingSessionAndCannotSignIn()
    {
        using var f = new KitchenFactory(); using var admin = await f.Login(); using var member = await f.Login(false);
        var me = await member.GetFromJsonAsync<JsonElement>("/api/auth/me"); var id = me.GetProperty("id").GetString();
        (await admin.PostAsync($"/api/admin/users/{id}/toggle", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await member.GetAsync("/api/recipes")).StatusCode);
        await KitchenFactory.Csrf(member);
        Assert.Equal(HttpStatusCode.Unauthorized, (await member.PostAsJsonAsync("/api/auth/login", new { username = me.GetProperty("username").GetString(), password = "Testing!Password42" })).StatusCode);
    }
    [Fact]
    public async Task RerollPreservesOtherSelectionsAndRejectsExhaustedPool()
    {
        using var f = new KitchenFactory(); using var c = await f.Login();
        var response = await c.PostAsJsonAsync("/api/recipes", Recipe()); var r = (await response.Content.ReadFromJsonAsync<MealPlanner.Recipe>())!;
        for (int i = 0; i < 3; i++) (await c.PostAsJsonAsync("/api/meals", new MealInput($"Meal {i}", "", [new(r.Id, 2)], null))).EnsureSuccessStatusCode();
        var meals = (await c.GetFromJsonAsync<JsonElement>("/api/meals")).EnumerateArray().Select(m => m.GetProperty("id").GetInt32()).ToList();
        var reroll = await c.PostAsJsonAsync("/api/planner/reroll", new RerollInput(meals.Take(2).ToList(), [], meals[0])); reroll.EnsureSuccessStatusCode();
        Assert.Equal(meals[2], (await reroll.Content.ReadFromJsonAsync<MealSnapshot>())!.MealId);
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsJsonAsync("/api/planner/reroll", new RerollInput(meals.Take(2).ToList(), [meals[2]], meals[0]))).StatusCode);
    }
}
