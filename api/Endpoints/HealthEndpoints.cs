using CbdgApi.Data;

namespace CbdgApi.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", async (CookbookDbContext db) =>
        {
            try
            {
                await db.Database.CanConnectAsync();
                return Results.Ok(new { status = "ok" });
            }
            catch
            {
                return Results.Problem("Database unavailable.", statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        });
    }
}
