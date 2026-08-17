namespace CbdgApi.Entities;

public class Category
{
    public Guid Id { get; set; }
    /// <summary>URL-friendly identifier, generated from Name at creation time and
    /// never regenerated on rename (see Slug.cs) - renaming a book must not break
    /// links people already have. Falls back to the Id's string form for names
    /// that slugify to nothing (e.g. emoji-only).</summary>
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public int Leather { get; set; }
    public int Ordinal { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public BookLayout Layout { get; set; } = BookLayout.Default();

    public List<RecipePage> Pages { get; set; } = [];
}

/// <summary>Owned by Category. Spread sizing is a display preference, not recipe content.</summary>
public class BookLayout
{
    public double SpreadWidth { get; set; }
    public double SpreadHeight { get; set; }
    public double PageRatio { get; set; }

    public static BookLayout Default() => new()
    {
        SpreadWidth = 1400,
        SpreadHeight = 640,
        PageRatio = 0.5,
    };
}
