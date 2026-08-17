using CbdgApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace CbdgApi.Data;

/// <summary>Seeds the three starter categories + sample recipe, mirroring the
/// frontend's old InMemoryStore seed data - only runs against an empty database.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(CookbookDbContext db)
    {
        if (await db.Categories.AnyAsync()) return;

        var now = DateTimeOffset.UtcNow;

        var meat = NewCategory("Meat", 0, 0, now);
        var bread = NewCategory("Bread", 1, 1, now);
        var keto = NewCategory("Keto", 2, 2, now);
        db.Categories.AddRange(meat, bread, keto);

        var samplePage = NewBlankPage(meat.Id, 0, now);
        samplePage.Title = "Skillet Chicken and Rice";
        samplePage.Servings = "4";
        samplePage.PrepTime = "15 min";
        samplePage.CookTime = "35 min";
        samplePage.OvenTemp = "425°F";
        samplePage.Notes = "Swap broth for stock as needed. Leftovers keep 3 days refrigerated.";
        db.Pages.Add(samplePage);

        db.SetupSteps.AddRange(
            new SetupStep { Id = Guid.NewGuid(), PageId = samplePage.Id, Ordinal = 0, Text = "Preheat oven to 425°F (220°C)." },
            new SetupStep { Id = Guid.NewGuid(), PageId = samplePage.Id, Ordinal = 1, Text = "Season chicken thighs generously with salt and pepper." }
        );

        // Forest: restAndServe -> [simmer, lemon]; simmer -> [combineAndToast, broth];
        // combineAndToast -> [sear, soften, rice]; sear -> [thighs, oil]; soften -> [onion, garlic].
        var sear = NewStep(samplePage.Id, null, 0);
        var searThighs = NewIngredient(samplePage.Id, sear.Id, 0, "4", "bone-in chicken thighs");
        var searOil = NewIngredient(samplePage.Id, sear.Id, 1, "1 tbsp", "olive oil");
        sear.Label = "Sear until golden, 3-4 min per side";

        var soften = NewStep(samplePage.Id, null, 1);
        var softenOnion = NewIngredient(samplePage.Id, soften.Id, 0, "1", "yellow onion, diced");
        var softenGarlic = NewIngredient(samplePage.Id, soften.Id, 1, "3 cloves", "garlic, minced");
        soften.Label = "Soften in the drippings, 4 min";

        var combineAndToast = NewStep(samplePage.Id, null, 0);
        var rice = NewIngredient(samplePage.Id, combineAndToast.Id, 2, "1 cup", "long-grain rice");
        combineAndToast.Label = "Combine and toast rice, 2 min";
        sear.ParentId = combineAndToast.Id;
        sear.Ordinal = 0;
        soften.ParentId = combineAndToast.Id;
        soften.Ordinal = 1;

        var simmer = NewStep(samplePage.Id, null, 0);
        var broth = NewIngredient(samplePage.Id, simmer.Id, 1, "2 cups", "chicken broth");
        simmer.Label = "Simmer, covered, 18 min";
        combineAndToast.ParentId = simmer.Id;
        combineAndToast.Ordinal = 0;

        var restAndServe = NewStep(samplePage.Id, null, 0);
        var lemon = NewIngredient(samplePage.Id, restAndServe.Id, 1, "1", "lemon, quartered");
        restAndServe.Label = "Rest 5 min, then serve";
        simmer.ParentId = restAndServe.Id;
        simmer.Ordinal = 0;

        db.Nodes.AddRange(
            sear, searThighs, searOil,
            soften, softenOnion, softenGarlic,
            combineAndToast, rice,
            simmer, broth,
            restAndServe, lemon
        );

        db.Pages.Add(NewBlankPage(meat.Id, 1, now));
        db.Pages.Add(NewBlankPage(bread.Id, 0, now));
        db.Pages.Add(NewBlankPage(bread.Id, 1, now));
        db.Pages.Add(NewBlankPage(keto.Id, 0, now));
        db.Pages.Add(NewBlankPage(keto.Id, 1, now));

        await db.SaveChangesAsync();
    }

    private static Category NewCategory(string name, int leather, int ordinal, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Slug = Slug.From(name),
        Name = name,
        Leather = leather,
        Ordinal = ordinal,
        CreatedAt = now,
        UpdatedAt = now,
        Layout = BookLayout.Default(),
    };

    private static RecipePage NewBlankPage(Guid categoryId, int ordinal, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        CategoryId = categoryId,
        Ordinal = ordinal,
        CreatedAt = now,
        UpdatedAt = now,
    };

    private static RecipeNode NewStep(Guid pageId, Guid? parentId, int ordinal) => new()
    {
        Id = Guid.NewGuid(),
        PageId = pageId,
        ParentId = parentId,
        Ordinal = ordinal,
        Kind = RecipeNodeKind.Step,
        Label = "",
    };

    private static RecipeNode NewIngredient(Guid pageId, Guid parentId, int ordinal, string amount, string name) => new()
    {
        Id = Guid.NewGuid(),
        PageId = pageId,
        ParentId = parentId,
        Ordinal = ordinal,
        Kind = RecipeNodeKind.Ingredient,
        Amount = amount,
        Name = name,
    };
}
