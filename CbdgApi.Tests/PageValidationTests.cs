using System.Net;
using System.Net.Http.Json;
using CbdgApi.Dtos;
using Xunit;

namespace CbdgApi.Tests;

/// <summary>
/// A bad tree must never reach the database - PUT /api/pages/{id} rejects it
/// with a 400 ProblemDetails instead of persisting.
/// </summary>
public class PageValidationTests : IClassFixture<CbdgApiFactory>
{
    private readonly HttpClient _client;

    public PageValidationTests(CbdgApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<(Guid pageId, DateTimeOffset updatedAt)> CreatePageAsync()
    {
        var categoryId = Guid.NewGuid();
        (await _client.PostAsJsonAsync("/api/categories", new CreateCategoryDto(categoryId, "Validation Test")))
            .EnsureSuccessStatusCode();

        var pageId = Guid.NewGuid();
        var createResp = await _client.PostAsJsonAsync($"/api/categories/{categoryId}/pages", new CreatePageDto(pageId));
        var created = await createResp.Content.ReadFromJsonAsync<PageDto>();
        return (pageId, created!.UpdatedAt);
    }

    [Fact]
    public async Task RejectsAStepWithNoChildren()
    {
        var (pageId, updatedAt) = await CreatePageAsync();
        var body = new SavePageDto("t", "", "", "", "", "", [],
            [new RecipeNodeDto(Guid.NewGuid(), "step", null, null, "empty", [])],
            [], updatedAt);

        var resp = await _client.PutAsJsonAsync($"/api/pages/{pageId}", body);

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task RejectsADuplicateNodeId()
    {
        var (pageId, updatedAt) = await CreatePageAsync();
        var dupId = Guid.NewGuid();
        var body = new SavePageDto("t", "", "", "", "", "", [],
            [
                new RecipeNodeDto(dupId, "ingredient", "1", "flour", null, null),
                new RecipeNodeDto(dupId, "ingredient", "2", "sugar", null, null),
            ],
            [], updatedAt);

        var resp = await _client.PutAsJsonAsync($"/api/pages/{pageId}", body);

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task AcceptsAWellFormedTree()
    {
        var (pageId, updatedAt) = await CreatePageAsync();
        var body = new SavePageDto("t", "", "", "", "", "", [],
            [new RecipeNodeDto(Guid.NewGuid(), "ingredient", "1", "flour", null, null)],
            [], updatedAt);

        var resp = await _client.PutAsJsonAsync($"/api/pages/{pageId}", body);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
