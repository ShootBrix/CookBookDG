using System.Text;

namespace CbdgApi.Data;

/// <summary>
/// Generates URL-friendly slugs from category names. Unicode letters/digits
/// are kept as-is (not transliterated to ASCII) - CBDG is bilingual (en/he)
/// and a Hebrew-named book deserves a real, readable slug in its own script,
/// not a GUID just because it isn't Latin text. A name that slugifies to
/// nothing (symbols/emoji only) falls back to the category's own id, which
/// keeps the "Slug" column always non-null and always resolvable.
/// </summary>
public static class Slug
{
    public static string From(string name)
    {
        var lower = name.Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        var lastWasHyphen = true; // swallow a would-be leading hyphen
        foreach (var ch in lower)
        {
            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(ch);
                lastWasHyphen = false;
            }
            else if (!lastWasHyphen)
            {
                sb.Append('-');
                lastWasHyphen = true;
            }
        }
        return sb.ToString().Trim('-');
    }

    /// <summary>Slugifies `name`, then appends -2, -3, ... until `existsAsync`
    /// reports the candidate is free. `fallbackId` covers the empty-slug case.</summary>
    public static async Task<string> GenerateUniqueAsync(
        string name,
        Guid fallbackId,
        Func<string, Task<bool>> existsAsync)
    {
        var baseSlug = From(name);
        if (baseSlug.Length == 0) return fallbackId.ToString();

        var candidate = baseSlug;
        var suffix = 2;
        while (await existsAsync(candidate))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return candidate;
    }
}
