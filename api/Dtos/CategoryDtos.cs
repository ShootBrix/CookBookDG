namespace CbdgApi.Dtos;

public record BookLayoutDto(double SpreadWidth, double SpreadHeight, double PageRatio);

public record CategoryDto(
    Guid Id,
    string Slug,
    string Name,
    int Leather,
    int Ordinal,
    int RecipeCount,
    BookLayoutDto Layout,
    DateTimeOffset UpdatedAt
);

/// <summary>Id is client-generated (crypto.randomUUID() on the frontend) so optimistic
/// local inserts never need to be reconciled with a server-assigned id.</summary>
public record CreateCategoryDto(Guid Id, string Name);

public record UpdateCategoryDto(
    string? Name,
    int? Leather,
    BookLayoutDto? Layout
);
