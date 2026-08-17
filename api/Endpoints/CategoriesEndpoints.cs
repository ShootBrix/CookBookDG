using CbdgApi.Data;
using CbdgApi.Dtos;
using CbdgApi.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CbdgApi.Endpoints;

public static class CategoriesEndpoints
{
    public static void MapCategoriesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories").WithTags("Categories");

        group.MapGet("", async (CookbookDbContext db) =>
        {
            var categories = await db.Categories
                .OrderBy(c => c.Ordinal)
                .Select(c => new CategoryDto(
                    c.Id,
                    c.Slug,
                    c.Name,
                    c.Leather,
                    c.Ordinal,
                    c.Pages.Count(p =>
                        p.Title.Trim() != "" ||
                        p.Notes.Trim() != "" ||
                        p.SetupSteps.Any(s => s.Text.Trim() != "") ||
                        p.Nodes.Count > 0 ||
                        p.Images.Count > 0),
                    new BookLayoutDto(c.Layout.SpreadWidth, c.Layout.SpreadHeight, c.Layout.PageRatio),
                    c.UpdatedAt))
                .ToListAsync();

            return Results.Ok(categories);
        });

        group.MapPost("", async (CreateCategoryDto dto, CookbookDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["name"] = ["Name is required."],
                });
            }
            if (await db.Categories.AnyAsync(c => c.Id == dto.Id))
            {
                return Results.Conflict(new ProblemDetails { Title = "Category id already exists." });
            }

            var name = dto.Name.Trim();
            var slug = await Slug.GenerateUniqueAsync(name, dto.Id,
                candidate => db.Categories.AnyAsync(c => c.Slug == candidate));

            var maxOrdinal = await db.Categories.Select(c => (int?)c.Ordinal).MaxAsync() ?? -1;
            var now = DateTimeOffset.UtcNow;
            var category = new Category
            {
                Id = dto.Id,
                Slug = slug,
                Name = name,
                Leather = (maxOrdinal + 1) % 6,
                Ordinal = maxOrdinal + 1,
                CreatedAt = now,
                UpdatedAt = now,
                Layout = BookLayout.Default(),
            };
            db.Categories.Add(category);
            await db.SaveChangesAsync();

            return Results.Created($"/api/categories/{category.Slug}", new CategoryDto(
                category.Id, category.Slug, category.Name, category.Leather, category.Ordinal, 0,
                new BookLayoutDto(category.Layout.SpreadWidth, category.Layout.SpreadHeight, category.Layout.PageRatio),
                category.UpdatedAt));
        });

        group.MapPatch("/{identifier}", async (string identifier, UpdateCategoryDto dto, CookbookDbContext db) =>
        {
            var category = await FindCategoryAsync(identifier, db);
            if (category is null) return Results.NotFound();

            // Slug is intentionally left untouched on rename - it's already
            // out in the world as a URL by the time anyone renames a book,
            // and silently changing it would break every link people have.
            if (dto.Name is not null) category.Name = dto.Name.Trim();
            if (dto.Leather is not null) category.Leather = dto.Leather.Value;
            if (dto.Layout is not null)
            {
                category.Layout = new BookLayout
                {
                    SpreadWidth = Math.Clamp(dto.Layout.SpreadWidth, 900, 2000),
                    SpreadHeight = Math.Clamp(dto.Layout.SpreadHeight, 480, 900),
                    PageRatio = Math.Clamp(dto.Layout.PageRatio, 0.3, 0.7),
                };
            }
            category.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();

            var recipeCount = await db.Pages.CountAsync(p =>
                p.CategoryId == category.Id && (
                    p.Title.Trim() != "" ||
                    p.Notes.Trim() != "" ||
                    p.SetupSteps.Any(s => s.Text.Trim() != "") ||
                    p.Nodes.Count > 0 ||
                    p.Images.Count > 0));

            return Results.Ok(new CategoryDto(
                category.Id, category.Slug, category.Name, category.Leather, category.Ordinal, recipeCount,
                new BookLayoutDto(category.Layout.SpreadWidth, category.Layout.SpreadHeight, category.Layout.PageRatio),
                category.UpdatedAt));
        });

        group.MapDelete("/{identifier}", async (string identifier, CookbookDbContext db) =>
        {
            var category = await FindCategoryAsync(identifier, db);
            if (category is null) return Results.NotFound();

            db.Categories.Remove(category);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapGet("/{identifier}/pages", async (string identifier, CookbookDbContext db) =>
        {
            var category = await FindCategoryAsync(identifier, db);
            if (category is null) return Results.NotFound();

            var pages = await db.Pages
                .Where(p => p.CategoryId == category.Id)
                .OrderBy(p => p.Ordinal)
                .ToListAsync();

            var result = new List<PageDto>();
            foreach (var page in pages)
            {
                result.Add(await PagesEndpoints.BuildPageDto(page, db));
            }
            return Results.Ok(result);
        });

        group.MapPost("/{identifier}/pages", async (string identifier, CreatePageDto dto, CookbookDbContext db) =>
        {
            var category = await FindCategoryAsync(identifier, db);
            if (category is null) return Results.NotFound();
            if (await db.Pages.AnyAsync(p => p.Id == dto.Id))
            {
                return Results.Conflict(new ProblemDetails { Title = "Page id already exists." });
            }

            var maxOrdinal = await db.Pages.Where(p => p.CategoryId == category.Id)
                .Select(p => (int?)p.Ordinal).MaxAsync() ?? -1;
            var now = DateTimeOffset.UtcNow;
            var page = new RecipePage
            {
                Id = dto.Id,
                CategoryId = category.Id,
                Ordinal = maxOrdinal + 1,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Pages.Add(page);
            await db.SaveChangesAsync();

            return Results.Created($"/api/pages/{page.Id}", await PagesEndpoints.BuildPageDto(page, db));
        });
    }

    /// <summary>Resolves a category from either its slug (the normal, user-facing
    /// URL segment) or its raw GUID (so links/bookmarks made before slugs existed
    /// keep working). Tries the GUID form first only when `identifier` actually
    /// parses as one, then falls back to a slug match either way.</summary>
    private static async Task<Category?> FindCategoryAsync(string identifier, CookbookDbContext db)
    {
        if (Guid.TryParse(identifier, out var id))
        {
            var byId = await db.Categories.FindAsync(id);
            if (byId is not null) return byId;
        }
        return await db.Categories.FirstOrDefaultAsync(c => c.Slug == identifier);
    }
}
