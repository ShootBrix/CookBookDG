using System.Net.Http.Json;
using CbdgApi.Dtos;
using Xunit;

namespace CbdgApi.Tests;

/// <summary>
/// Reproduces the save/reload corruption bug: the API round-trip must
/// preserve a nested ingredient/step forest exactly, across repeated saves
/// that reuse the same node ids (the normal case - node ids are stable and
/// client-generated, so every edit-then-save resends existing ids alongside
/// any new ones).
/// </summary>
public class PageNodeRoundTripTests : IClassFixture<CbdgApiFactory>
{
    private readonly HttpClient _client;

    public PageNodeRoundTripTests(CbdgApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task NestedTree_SurvivesRepeatedSavesWithReusedNodeIds()
    {
        var categoryId = Guid.NewGuid();
        (await _client.PostAsJsonAsync("/api/categories", new CreateCategoryDto(categoryId, "Round Trip Test")))
            .EnsureSuccessStatusCode();

        var pageId = Guid.NewGuid();
        var createResp = await _client.PostAsJsonAsync($"/api/categories/{categoryId}/pages", new CreatePageDto(pageId));
        createResp.EnsureSuccessStatusCode();
        var created = await createResp.Content.ReadFromJsonAsync<PageDto>();

        // 2 ingredients -> step ("mix") -> + ingredient -> step ("fold in"),
        // matching the exact shape from the bug report.
        var ing1 = Guid.NewGuid();
        var ing2 = Guid.NewGuid();
        var ing3 = Guid.NewGuid();
        var step1 = Guid.NewGuid();
        var step2 = Guid.NewGuid();

        List<RecipeNodeDto> BuildTree() =>
        [
            new RecipeNodeDto(step2, "step", null, null, "fold in",
            [
                new RecipeNodeDto(step1, "step", null, null, "mix",
                [
                    new RecipeNodeDto(ing1, "ingredient", "1", "flour", null, null),
                    new RecipeNodeDto(ing2, "ingredient", "2", "sugar", null, null),
                ]),
                new RecipeNodeDto(ing3, "ingredient", "3", "egg", null, null),
            ]),
        ];

        async Task<PageDto> SaveAsync(DateTimeOffset updatedAt)
        {
            var body = new SavePageDto(
                "Round-trip test", "", "", "", "", "",
                [], BuildTree(), [], updatedAt);
            var resp = await _client.PutAsJsonAsync($"/api/pages/{pageId}", body);
            resp.EnsureSuccessStatusCode();
            return (await resp.Content.ReadFromJsonAsync<PageDto>())!;
        }

        static void AssertTreeIntact(List<RecipeNodeDto> nodes, Guid step2, Guid step1, Guid ing1, Guid ing2, Guid ing3)
        {
            var root = Assert.Single(nodes);
            Assert.Equal("step", root.Kind);
            Assert.Equal(step2, root.Id);
            Assert.NotNull(root.Children);
            Assert.Equal(2, root.Children!.Count);

            var innerStep = root.Children[0];
            Assert.Equal("step", innerStep.Kind);
            Assert.Equal(step1, innerStep.Id);
            Assert.NotNull(innerStep.Children);
            Assert.Equal(2, innerStep.Children!.Count);
            Assert.Equal(ing1, innerStep.Children[0].Id);
            Assert.Equal(ing2, innerStep.Children[1].Id);

            var lastIngredient = root.Children[1];
            Assert.Equal(ing3, lastIngredient.Id);
            Assert.Equal("ingredient", lastIngredient.Kind);
        }

        // First save is a fresh insert - already worked before the fix.
        var first = await SaveAsync(created!.UpdatedAt);
        AssertTreeIntact(first.Nodes, step2, step1, ing1, ing2, ing3);

        // Second save re-sends the SAME node ids with only the root's label
        // changed - an ordinary edit-and-resave. This is where the bug
        // dropped every node whose row was byte-for-byte unchanged.
        var second = await SaveAsync(first.UpdatedAt);
        AssertTreeIntact(second.Nodes, step2, step1, ing1, ing2, ing3);

        // A fresh GET (not just the PUT response echo) must show the same tree.
        var pages = await _client.GetFromJsonAsync<List<PageDto>>($"/api/categories/{categoryId}/pages");
        var reloaded = Assert.Single(pages!);
        AssertTreeIntact(reloaded.Nodes, step2, step1, ing1, ing2, ing3);
    }

    [Fact]
    public async Task ReorderingIngredients_PreservesStepRelationshipsAcrossASave()
    {
        var categoryId = Guid.NewGuid();
        (await _client.PostAsJsonAsync("/api/categories", new CreateCategoryDto(categoryId, "Reorder Test")))
            .EnsureSuccessStatusCode();

        var pageId = Guid.NewGuid();
        var createResp = await _client.PostAsJsonAsync($"/api/categories/{categoryId}/pages", new CreatePageDto(pageId));
        var created = await createResp.Content.ReadFromJsonAsync<PageDto>();

        var ing1 = Guid.NewGuid();
        var ing2 = Guid.NewGuid();
        var ing3 = Guid.NewGuid();
        var step1 = Guid.NewGuid();

        async Task<PageDto> SaveAsync(List<RecipeNodeDto> nodes, DateTimeOffset updatedAt)
        {
            var body = new SavePageDto("Reorder test", "", "", "", "", "", [], nodes, [], updatedAt);
            var resp = await _client.PutAsJsonAsync($"/api/pages/{pageId}", body);
            resp.EnsureSuccessStatusCode();
            return (await resp.Content.ReadFromJsonAsync<PageDto>())!;
        }

        // step1(ing1, ing2), ing3
        var first = await SaveAsync(
        [
            new RecipeNodeDto(step1, "step", null, null, "mix",
            [
                new RecipeNodeDto(ing1, "ingredient", "1", "flour", null, null),
                new RecipeNodeDto(ing2, "ingredient", "2", "sugar", null, null),
            ]),
            new RecipeNodeDto(ing3, "ingredient", "3", "egg", null, null),
        ], created!.UpdatedAt);

        // Resave with ing1/ing2 swapped inside the step, and the step moved
        // after ing3 at the root - same ids, same nesting, new order.
        var second = await SaveAsync(
        [
            new RecipeNodeDto(ing3, "ingredient", "3", "egg", null, null),
            new RecipeNodeDto(step1, "step", null, null, "mix",
            [
                new RecipeNodeDto(ing2, "ingredient", "2", "sugar", null, null),
                new RecipeNodeDto(ing1, "ingredient", "1", "flour", null, null),
            ]),
        ], first.UpdatedAt);

        Assert.Equal(2, second.Nodes.Count);
        Assert.Equal(ing3, second.Nodes[0].Id);
        var reorderedStep = second.Nodes[1];
        Assert.Equal(step1, reorderedStep.Id);
        Assert.NotNull(reorderedStep.Children);
        Assert.Equal([ing2, ing1], reorderedStep.Children!.Select(c => c.Id));
    }
}
