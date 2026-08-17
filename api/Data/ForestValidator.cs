using CbdgApi.Dtos;
using CbdgApi.Entities;

namespace CbdgApi.Data;

public class ForestValidationException(string message) : Exception(message);

/// <summary>
/// Server-side mirror of src/recipeGrid/validate.ts's validateForest - a bad
/// tree should never reach the database. Two passes, because "orphaned
/// child" and "duplicate ordinal" are only meaningful on the flat,
/// ParentId-based representation the DB actually stores, while "step with no
/// children" and "cycle/duplicate id" are checked on the nested DTO tree
/// exactly as the client sent it.
/// </summary>
public static class ForestValidator
{
    /// <summary>Validates the nested tree as received from the client, before
    /// it's flattened.</summary>
    public static void ValidateTree(IReadOnlyList<RecipeNodeDto> nodes)
    {
        var seenIds = new HashSet<Guid>();

        void Visit(RecipeNodeDto node)
        {
            if (!seenIds.Add(node.Id))
            {
                throw new ForestValidationException(
                    $"Node \"{node.Id}\" appears more than once in the tree (cycle or duplicate id).");
            }

            if (node.Kind != "step") return;

            if (node.Children is null || node.Children.Count == 0)
            {
                throw new ForestValidationException(
                    $"Step \"{node.Id}\" (label \"{node.Label}\") has no children.");
            }

            var siblingIds = new HashSet<Guid>();
            foreach (var child in node.Children)
            {
                if (!siblingIds.Add(child.Id))
                {
                    throw new ForestValidationException(
                        $"Step \"{node.Id}\" has duplicate child id \"{child.Id}\".");
                }
                Visit(child);
            }
        }

        var rootIds = new HashSet<Guid>();
        foreach (var node in nodes)
        {
            if (!rootIds.Add(node.Id))
            {
                throw new ForestValidationException($"Duplicate root id \"{node.Id}\".");
            }
            Visit(node);
        }
    }

    /// <summary>Validates the flattened, ParentId-based rows about to be
    /// persisted: every ParentId must resolve to a node in the same batch
    /// (no orphans), and ordinals must be unique among the children of any
    /// one parent.</summary>
    public static void ValidateFlat(IReadOnlyList<RecipeNode> flatNodes)
    {
        var idsInBatch = flatNodes.Select(n => n.Id).ToHashSet();
        var ordinalsByParent = new Dictionary<Guid, HashSet<int>>();

        foreach (var node in flatNodes)
        {
            if (node.ParentId is { } parentId && !idsInBatch.Contains(parentId))
            {
                throw new ForestValidationException(
                    $"Node \"{node.Id}\" references parent \"{parentId}\", which doesn't exist in this save (orphaned child).");
            }

            var parentKey = node.ParentId ?? Guid.Empty;
            if (!ordinalsByParent.TryGetValue(parentKey, out var ordinals))
            {
                ordinals = [];
                ordinalsByParent[parentKey] = ordinals;
            }
            if (!ordinals.Add(node.Ordinal))
            {
                throw new ForestValidationException(
                    $"Node \"{node.Id}\" has ordinal {node.Ordinal}, which duplicates a sibling under parent \"{parentKey}\".");
            }
        }
    }
}
