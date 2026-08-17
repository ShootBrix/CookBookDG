using CbdgApi.Data;
using CbdgApi.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CbdgApi.Endpoints;

public static class PagesEndpoints
{
    public static async Task<PageDto> BuildPageDto(Entities.RecipePage page, CookbookDbContext db)
    {
        var setup = await db.SetupSteps
            .Where(s => s.PageId == page.Id)
            .OrderBy(s => s.Ordinal)
            .Select(s => s.Text)
            .ToListAsync();

        var nodes = await db.Nodes.Where(n => n.PageId == page.Id).ToListAsync();
        var images = await db.Images
            .Where(i => i.PageId == page.Id)
            .OrderBy(i => i.Ordinal)
            .Select(i => new RecipeImageDto(i.Id, i.Caption, i.Width, i.Height, i.ByteSize))
            .ToListAsync();

        return new PageDto(
            page.Id,
            page.CategoryId,
            page.Ordinal,
            page.Title,
            page.Servings,
            page.PrepTime,
            page.CookTime,
            page.OvenTemp,
            page.Notes,
            setup,
            NodeTree.Build(nodes),
            images,
            page.UpdatedAt
        );
    }

    public static void MapPagesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/pages").WithTags("Pages");

        group.MapPut("/{id:guid}", async (Guid id, SavePageDto dto, CookbookDbContext db) =>
        {
            var page = await db.Pages.FindAsync(id);
            if (page is null) return Results.NotFound();

            if (page.UpdatedAt > dto.UpdatedAt)
            {
                return Results.Conflict(new ProblemDetails
                {
                    Title = "This page changed elsewhere.",
                    Detail = "The recipe was updated by someone else since you last loaded it. Reload to see the latest version before saving again.",
                    Status = StatusCodes.Status409Conflict,
                });
            }

            // Validate before touching anything - a corrupt tree must never
            // reach the database. Checked in both representations: the nested
            // shape the client sent (step-has-children, cycle/duplicate id),
            // and the flattened, ParentId-based shape about to be persisted
            // (orphaned child, duplicate ordinal per parent).
            List<Entities.RecipeNode> newFlatNodes;
            try
            {
                ForestValidator.ValidateTree(dto.Nodes);
                newFlatNodes = NodeTree.Flatten(dto.Nodes, id);
                ForestValidator.ValidateFlat(newFlatNodes);
            }
            catch (ForestValidationException ex)
            {
                return Results.Problem(new ProblemDetails
                {
                    Title = "This recipe's structure is invalid.",
                    Detail = ex.Message,
                    Status = StatusCodes.Status400BadRequest,
                });
            }

            await using var tx = await db.Database.BeginTransactionAsync();

            page.Title = dto.Title;
            page.Servings = dto.Servings;
            page.PrepTime = dto.PrepTime;
            page.CookTime = dto.CookTime;
            page.OvenTemp = dto.OvenTemp;
            page.Notes = dto.Notes;
            page.UpdatedAt = DateTimeOffset.UtcNow;

            var oldSetup = await db.SetupSteps.Where(s => s.PageId == id).ToListAsync();
            db.SetupSteps.RemoveRange(oldSetup);
            var ordinal = 0;
            foreach (var text in dto.Setup)
            {
                db.SetupSteps.Add(new Entities.SetupStep
                {
                    Id = Guid.NewGuid(),
                    PageId = id,
                    Ordinal = ordinal++,
                    Text = text,
                });
            }

            // Upsert by id rather than delete-all-then-insert-all. Node ids are
            // stable and client-generated, so almost every save resends ids
            // that already exist in the table. Removing the old row and Add()-ing
            // a *new* RecipeNode instance with that same id makes EF's change
            // tracker see two tracked entries sharing a key - it resolves that
            // by collapsing them into a single entry, and for any node whose
            // data happens to be byte-for-byte unchanged since the last save,
            // that collapsed entry stays in the Deleted state (nothing about it
            // looked "modified"), so the row is deleted and never reinserted.
            // The net effect: any untouched node - and everything under it,
            // since its children reference it as ParentId - silently vanishes.
            // Mutating the existing tracked entity in place for known ids, and
            // only Remove/Add for ids that actually left/entered the tree,
            // avoids the collision entirely.
            var oldNodes = await db.Nodes.Where(n => n.PageId == id).ToListAsync();
            var oldNodesById = oldNodes.ToDictionary(n => n.Id);
            var newNodeIds = newFlatNodes.Select(n => n.Id).ToHashSet();

            foreach (var old in oldNodes)
            {
                if (!newNodeIds.Contains(old.Id)) db.Nodes.Remove(old);
            }

            // newFlatNodes is parent-first (see NodeTree.Flatten/Walk), so a
            // brand-new child's ParentId always names a node already added
            // (or already existing) by the time it's processed.
            foreach (var node in newFlatNodes)
            {
                if (oldNodesById.TryGetValue(node.Id, out var existing))
                {
                    existing.ParentId = node.ParentId;
                    existing.Ordinal = node.Ordinal;
                    existing.Kind = node.Kind;
                    existing.Amount = node.Amount;
                    existing.Name = node.Name;
                    existing.Label = node.Label;
                }
                else
                {
                    db.Nodes.Add(node);
                }
            }

            var captionById = dto.ImageCaptions.ToDictionary(c => c.Id, c => c.Caption);
            var images = await db.Images.Where(i => i.PageId == id).ToListAsync();
            foreach (var image in images)
            {
                if (captionById.TryGetValue(image.Id, out var caption)) image.Caption = caption;
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Results.Ok(await BuildPageDto(page, db));
        });

        group.MapDelete("/{id:guid}", async (Guid id, CookbookDbContext db) =>
        {
            var page = await db.Pages.FindAsync(id);
            if (page is null) return Results.NotFound();

            db.Pages.Remove(page);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
