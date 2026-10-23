using MealPlanner;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders(); builder.Logging.AddConsole();
var data = builder.Configuration["DataDirectory"] ?? Path.Combine(builder.Environment.ContentRootPath, "data");
Directory.CreateDirectory(data);
if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(data, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
builder.Services.AddDbContext<AppDb>(o => o.UseSqlite($"Data Source={Path.Combine(data, "meals.db")};Foreign Keys=True;Default Timeout=5"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(data, "keys"))).SetApplicationName("MealPlanner");
builder.Services.AddIdentity<User, IdentityRole>(o => { o.Password.RequiredLength = 12; o.Lockout.MaxFailedAccessAttempts = 5; o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15); }).AddEntityFrameworkStores<AppDb>().AddDefaultTokenProviders();
builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "MealPlanner.Session"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = TimeSpan.FromHours(8); o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.Configure<SecurityStampValidatorOptions>(o => o.ValidationInterval = TimeSpan.Zero);
builder.Services.AddAuthorization();
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.SameSite = SameSiteMode.Strict; o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always; });
builder.Services.AddRateLimiter(o => { o.RejectionStatusCode = 429; o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 15, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 })); });
builder.Services.Configure<ForwardedHeadersOptions>(o => { o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto; if (System.Net.IPAddress.TryParse(builder.Configuration["ProxyAddress"], out var ip)) o.KnownProxies.Add(ip); });
builder.Services.AddProblemDetails(); builder.Services.AddOpenApi();
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 1_048_576);
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync(); await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
    if (!await db.Households.AnyAsync()) { db.Households.Add(new()); await db.SaveChangesAsync(); }
    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Admin", "Member" }) if (!await roles.RoleExistsAsync(role)) await roles.CreateAsync(new(role));
    if (args.Contains("bootstrap-admin"))
    {
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        if ((await users.GetUsersInRoleAsync("Admin")).Count != 0) throw new InvalidOperationException("An admin already exists.");
        var user = new User { UserName = Environment.GetEnvironmentVariable("BOOTSTRAP_USERNAME") ?? throw new InvalidOperationException("Set BOOTSTRAP_USERNAME.") };
        var result = await users.CreateAsync(user, Environment.GetEnvironmentVariable("BOOTSTRAP_PASSWORD") ?? throw new InvalidOperationException("Set BOOTSTRAP_PASSWORD."));
        if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(x => x.Description)));
        await users.AddToRoleAsync(user, "Admin"); Console.WriteLine("Admin created."); return;
    }
}
app.UseForwardedHeaders(); app.UseExceptionHandler(); app.UseStatusCodePages();
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff"; ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
    ctx.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    if (ctx.Request.Path.StartsWithSegments("/api")) ctx.Response.Headers.CacheControl = "no-store";
    try { await next(); }
    catch (DbUpdateConcurrencyException) { await Results.Problem(statusCode: 409, detail: "Changed by another household member. Reload before retrying.").ExecuteAsync(ctx); }
    catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteErrorCode: 19 }) { await Results.Problem(statusCode: 409, detail: "A related record changed. Reload before retrying.").ExecuteAsync(ctx); }
    catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteErrorCode: 5 or 6 }) { await Results.Problem(statusCode: 503, detail: "Kitchen is busy. Retry in a moment.").ExecuteAsync(ctx); }
    catch (ArgumentException e) { await Results.Problem(statusCode: 400, detail: e.Message).ExecuteAsync(ctx); }
});
if (!app.Environment.IsDevelopment()) { app.UseHsts(); app.UseHttpsRedirection(); }
app.UseDefaultFiles(); app.UseStaticFiles(); app.UseRouting(); app.UseRateLimiter(); app.UseAuthentication();
app.Use(async (ctx, next) =>
{
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        var user = await ctx.RequestServices.GetRequiredService<UserManager<User>>().GetUserAsync(ctx.User);
        if (user is null || user.Disabled)
        {
            await ctx.SignOutAsync(IdentityConstants.ApplicationScheme);
            await Results.Problem(statusCode: 401, detail: "Account unavailable.").ExecuteAsync(ctx);
            return;
        }
        if (user.HouseholdId != 1) { await Results.Problem(statusCode: 403, detail: "Household access unavailable.").ExecuteAsync(ctx); return; }
    }
    await next();
});
app.UseAuthorization();
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !HttpMethods.IsOptions(ctx.Request.Method))
    {
        try { await ctx.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(ctx); }
        catch (AntiforgeryValidationException) { await Results.Problem(statusCode: 400, detail: "Security token expired. Reload and retry.").ExecuteAsync(ctx); return; }
    }
    await next();
});
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/auth/csrf", (HttpContext c, IAntiforgery a) => Results.Ok(new { token = a.GetAndStoreTokens(c).RequestToken }));
app.MapAccess(); app.MapCatalog(); app.MapPlanning(); app.MapOpenApi().RequireAuthorization();
app.Map("/api/{**path}", () => Results.Problem(statusCode: 404)); app.MapFallbackToFile("index.html"); app.Run();
public partial class Program { }
