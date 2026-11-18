using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner;

internal static class PlanPreviews
{
    public static async Task<List<MealSnapshot>> Create(AppDb db, List<int> ids, TimeProvider clock)
    {
        var meals = await MealQueries.Full(db).AsNoTrackingWithIdentityResolution()
            .Where(meal => ids.Contains(meal.Id)).ToDictionaryAsync(meal => meal.Id);
        if (meals.Count != ids.Count) throw new DbUpdateConcurrencyException();

        var now = clock.GetUtcNow().UtcDateTime;
        var expires = now.AddDays(7);
        var previews = ids.Select(id =>
        {
            var snapshot = Planning.Snapshot(meals[id]);
            var payload = JsonSerializer.Serialize(snapshot, JsonSerializerOptions.Web);
            var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)));
            return (Snapshot: snapshot with { PreviewKey = key }, Payload: payload);
        }).ToList();

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.MealPreviews.Where(preview => preview.ExpiresAt <= now).ExecuteDeleteAsync();
        foreach (var (snapshot, payload) in previews)
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO MealPreviews (Key, MealId, Payload, ExpiresAt) VALUES ({snapshot.PreviewKey}, {snapshot.MealId}, {payload}, {expires})
                ON CONFLICT(Key) DO UPDATE SET ExpiresAt = excluded.ExpiresAt
                """);
        }
        await transaction.CommitAsync();
        return previews.Select(item => item.Snapshot).ToList();
    }

    public static async Task<List<string>?> Resolve(AppDb db, List<MealReference> references, List<SnapshotEntry> entries, DateTime now)
    {
        var keys = references.Where(item => item.PreviewKey != null).Select(item => item.PreviewKey!).ToList();
        var previews = await db.MealPreviews.AsNoTracking().Where(item => keys.Contains(item.Key) && item.ExpiresAt > now)
            .ToDictionaryAsync(item => item.Key);
        var saved = references.Any(item => item.PreviewKey is null)
            ? entries.ToDictionary(entry => JsonSerializer.Deserialize<MealReference>(entry.Payload, JsonSerializerOptions.Web)!.MealId)
            : [];
        var payloads = new List<string>(references.Count);
        foreach (var item in references)
        {
            if (item.PreviewKey is string key && previews.TryGetValue(key, out var preview) && preview.MealId == item.MealId)
                payloads.Add(preview.Payload);
            else if (item.PreviewKey is null && saved.TryGetValue(item.MealId, out var entry))
                payloads.Add(entry.Payload);
            else return null;
        }
        return payloads;
    }
}
