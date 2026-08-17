namespace CbdgApi.Entities;

public class RecipePage
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public int Ordinal { get; set; }
    public string Title { get; set; } = "";
    public string Servings { get; set; } = "";
    public string PrepTime { get; set; } = "";
    public string CookTime { get; set; } = "";
    public string OvenTemp { get; set; } = "";
    public string Notes { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<SetupStep> SetupSteps { get; set; } = [];
    public List<RecipeNode> Nodes { get; set; } = [];
    public List<RecipeImage> Images { get; set; } = [];
}

public class SetupStep
{
    public Guid Id { get; set; }
    public Guid PageId { get; set; }
    public int Ordinal { get; set; }
    public string Text { get; set; } = "";
}

public enum RecipeNodeKind
{
    Ingredient = 0,
    Step = 1,
}

/// <summary>
/// One row of the ingredient/step forest. Self-referencing via ParentId; the tree is
/// rebuilt in memory from a flat PageId query, ordered by Ordinal within each parent -
/// never loaded via recursive EF Include.
/// </summary>
public class RecipeNode
{
    public Guid Id { get; set; }
    public Guid PageId { get; set; }
    public Guid? ParentId { get; set; }
    public int Ordinal { get; set; }
    public RecipeNodeKind Kind { get; set; }

    // Ingredient fields
    public string? Amount { get; set; }
    public string? Name { get; set; }

    // Step field
    public string? Label { get; set; }
}

public class RecipeImage
{
    public Guid Id { get; set; }
    public Guid PageId { get; set; }
    public int Ordinal { get; set; }
    public string Caption { get; set; } = "";
    public string ContentType { get; set; } = "";
    public int Width { get; set; }
    public int Height { get; set; }
    public byte[] Bytes { get; set; } = [];
    public long ByteSize { get; set; }
}
