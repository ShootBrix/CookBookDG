namespace CbdgApi.Dtos;

/// <summary>
/// Mirrors the frontend's discriminated union (recipeGrid/types.ts): kind is
/// "ingredient" (amount/name set) or "step" (label/children set).
/// </summary>
public record RecipeNodeDto(
    Guid Id,
    string Kind,
    string? Amount,
    string? Name,
    string? Label,
    List<RecipeNodeDto>? Children
);

public record RecipeImageDto(
    Guid Id,
    string Caption,
    int Width,
    int Height,
    long Bytes
);

public record PageDto(
    Guid Id,
    Guid CategoryId,
    int Ordinal,
    string Title,
    string Servings,
    string PrepTime,
    string CookTime,
    string OvenTemp,
    string Notes,
    List<string> Setup,
    List<RecipeNodeDto> Nodes,
    List<RecipeImageDto> Images,
    DateTimeOffset UpdatedAt
);

/// <summary>Whole-page save payload (title/meta/setup/nodes/notes/captions). Images are
/// uploaded/deleted through their own endpoints, not through this save.</summary>
public record SavePageDto(
    string Title,
    string Servings,
    string PrepTime,
    string CookTime,
    string OvenTemp,
    string Notes,
    List<string> Setup,
    List<RecipeNodeDto> Nodes,
    List<ImageCaptionDto> ImageCaptions,
    DateTimeOffset UpdatedAt
);

public record ImageCaptionDto(Guid Id, string Caption);

/// <summary>Id is client-generated, matching CreateCategoryDto's reasoning.</summary>
public record CreatePageDto(Guid Id);

