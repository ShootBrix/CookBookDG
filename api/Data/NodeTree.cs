using CbdgApi.Dtos;
using CbdgApi.Entities;

namespace CbdgApi.Data;

/// <summary>
/// Converts between the flat RecipeNode rows (self-referencing via ParentId,
/// ordered by Ordinal) and the nested RecipeNodeDto tree the frontend works
/// with. Deliberately in-memory - no recursive EF Include.
/// </summary>
public static class NodeTree
{
    public static List<RecipeNodeDto> Build(IEnumerable<RecipeNode> flatNodes)
    {
        var byParent = flatNodes
            .GroupBy(n => n.ParentId ?? Guid.Empty)
            .ToDictionary(g => g.Key, g => g.OrderBy(n => n.Ordinal).ToList());

        List<RecipeNodeDto> BuildLevel(Guid? parentId)
        {
            if (!byParent.TryGetValue(parentId ?? Guid.Empty, out var children)) return [];
            return children.Select(n => new RecipeNodeDto(
                n.Id,
                n.Kind == RecipeNodeKind.Ingredient ? "ingredient" : "step",
                n.Amount,
                n.Name,
                n.Label,
                n.Kind == RecipeNodeKind.Step ? BuildLevel(n.Id) : null
            )).ToList();
        }

        return BuildLevel(null);
    }

    public static List<RecipeNode> Flatten(IEnumerable<RecipeNodeDto> tree, Guid pageId)
    {
        var result = new List<RecipeNode>();

        void Walk(IEnumerable<RecipeNodeDto> nodes, Guid? parentId)
        {
            var ordinal = 0;
            foreach (var node in nodes)
            {
                var isStep = node.Kind == "step";
                result.Add(new RecipeNode
                {
                    Id = node.Id == Guid.Empty ? Guid.NewGuid() : node.Id,
                    PageId = pageId,
                    ParentId = parentId,
                    Ordinal = ordinal++,
                    Kind = isStep ? RecipeNodeKind.Step : RecipeNodeKind.Ingredient,
                    Amount = isStep ? null : node.Amount ?? "",
                    Name = isStep ? null : node.Name ?? "",
                    Label = isStep ? node.Label ?? "" : null,
                });
                if (isStep && node.Children is not null)
                {
                    Walk(node.Children, node.Id == Guid.Empty ? result[^1].Id : node.Id);
                }
            }
        }

        Walk(tree, null);
        return result;
    }
}
