using CbdgApi.Data;
using CbdgApi.Endpoints;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("No database connection string configured (ConnectionStrings__Default).");

builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 5 * 1024 * 1024);

builder.Services.AddDbContext<CookbookDbContext>(o => o.UseNpgsql(connectionString));
builder.Services.AddProblemDetails();

const string WebOriginPolicy = "web-origin";
var webOrigin = builder.Configuration["WebOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy(WebOriginPolicy, policy =>
        policy.WithOrigins(webOrigin).AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        // Malformed request bodies (e.g. an invalid JSON value) surface as
        // BadHttpRequestException - that's a client error (400), not a server
        // fault, even though it reaches this catch-all handler like any
        // other unhandled exception.
        var status = feature?.Error is BadHttpRequestException badRequest
            ? badRequest.StatusCode
            : StatusCodes.Status500InternalServerError;
        var problem = new ProblemDetails
        {
            Status = status,
            Title = status == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred."
                : "The request could not be processed.",
            Detail = app.Environment.IsDevelopment() ? feature?.Error.ToString() : null,
        };
        context.Response.StatusCode = problem.Status.Value;
        await context.Response.WriteAsJsonAsync(problem);
    });
});

app.UseCors(WebOriginPolicy);

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CookbookDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

app.MapCategoriesEndpoints();
app.MapPagesEndpoints();
app.MapImagesEndpoints();
app.MapHealthEndpoints();

app.Run();

// Exposes the top-level Program for WebApplicationFactory<Program> in
// CbdgApi.Tests - minimal APIs generate an internal Program class by default.
public partial class Program { }
