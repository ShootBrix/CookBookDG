using CbdgApi.Data;
using CbdgApi.Dtos;
using CbdgApi.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;

namespace CbdgApi.Endpoints;

public static class ImagesEndpoints
{
    public const int MaxImagesPerPage = 2;
    public const long MaxImageBytes = 2 * 1024 * 1024;

    public static void MapImagesEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/pages/{pageId:guid}/images", async (
            Guid pageId, HttpRequest request, CookbookDbContext db) =>
        {
            if (!await db.Pages.AnyAsync(p => p.Id == pageId)) return Results.NotFound();

            if (!request.HasFormContentType)
            {
                return Results.Problem("Expected multipart/form-data.", statusCode: StatusCodes.Status400BadRequest);
            }

            var form = await request.ReadFormAsync();
            var file = form.Files["file"];
            var idRaw = form["id"].ToString();
            var caption = form["caption"].ToString();

            if (file is null || file.Length == 0)
            {
                return Results.Problem("A file is required.", statusCode: StatusCodes.Status400BadRequest);
            }
            if (!Guid.TryParse(idRaw, out var imageId))
            {
                return Results.Problem("A valid image id is required.", statusCode: StatusCodes.Status400BadRequest);
            }
            if (file.Length > MaxImageBytes)
            {
                return Results.Problem("Image too large.", statusCode: StatusCodes.Status413PayloadTooLarge);
            }

            var currentCount = await db.Images.CountAsync(i => i.PageId == pageId);
            if (currentCount >= MaxImagesPerPage)
            {
                return Results.Problem(
                    "This page already has the maximum number of images.",
                    statusCode: StatusCodes.Status409Conflict);
            }

            byte[] bytes;
            using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                bytes = ms.ToArray();
            }

            // Decode server-side: never trust the client's declared content-type or dimensions.
            IImageFormat format;
            int width, height;
            try
            {
                using var image = Image.Load(bytes);
                format = image.Metadata.DecodedImageFormat
                    ?? throw new UnknownImageFormatException("Unrecognized image format.");
                width = image.Width;
                height = image.Height;
            }
            catch (UnknownImageFormatException)
            {
                return Results.Problem("That file couldn't be read as an image.", statusCode: StatusCodes.Status400BadRequest);
            }

            var contentType = format.DefaultMimeType;
            if (contentType is not ("image/png" or "image/jpeg" or "image/webp"))
            {
                return Results.Problem("Only PNG, JPEG, or WebP images are accepted.", statusCode: StatusCodes.Status400BadRequest);
            }

            var maxOrdinal = await db.Images.Where(i => i.PageId == pageId)
                .Select(i => (int?)i.Ordinal).MaxAsync() ?? -1;

            var entity = new RecipeImage
            {
                Id = imageId,
                PageId = pageId,
                Ordinal = maxOrdinal + 1,
                Caption = caption,
                ContentType = contentType,
                Width = width,
                Height = height,
                Bytes = bytes,
                ByteSize = bytes.LongLength,
            };
            db.Images.Add(entity);
            await db.SaveChangesAsync();

            return Results.Created($"/api/images/{entity.Id}",
                new RecipeImageDto(entity.Id, entity.Caption, entity.Width, entity.Height, entity.ByteSize));
        }).DisableAntiforgery();

        app.MapDelete("/api/images/{id:guid}", async (Guid id, CookbookDbContext db) =>
        {
            var image = await db.Images.FindAsync(id);
            if (image is null) return Results.NotFound();

            db.Images.Remove(image);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        app.MapGet("/api/images/{id:guid}", async (Guid id, HttpRequest request, CookbookDbContext db) =>
        {
            var image = await db.Images
                .Where(i => i.Id == id)
                .Select(i => new { i.ContentType, i.Bytes })
                .FirstOrDefaultAsync();
            if (image is null) return Results.NotFound();

            var etag = $"\"{id:N}\"";
            var response = request.HttpContext.Response;
            response.Headers.CacheControl = "public, max-age=31536000, immutable";
            response.Headers.ETag = etag;

            if (request.Headers.IfNoneMatch.Any(h => h == etag))
            {
                return Results.StatusCode(StatusCodes.Status304NotModified);
            }

            return Results.File(image.Bytes, image.ContentType);
        });
    }
}
