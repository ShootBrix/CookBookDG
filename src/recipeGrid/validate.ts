import type { RecipeNode } from './types'

export class ForestValidationError extends Error {}

/**
 * Asserts every invariant the layout module (grid.ts) and the rest of the
 * app depend on: every step has 1+ children, and no id repeats anywhere in
 * the tree (covers both an accidental duplicate and a true cycle - a node
 * that's somehow its own descendant would revisit an id already seen on the
 * path down to it). Throws a descriptive error naming the offending node
 * rather than let corrupt data reach buildGrid().
 */
export function validateForest(nodes: RecipeNode[]): void {
  const seenIds = new Set<string>()

  function visit(node: RecipeNode): void {
    if (seenIds.has(node.id)) {
      throw new ForestValidationError(
        `Corrupt recipe tree: node "${node.id}" appears more than once (cycle or duplicate id).`,
      )
    }
    seenIds.add(node.id)

    if (node.kind !== 'step') return

    if (node.children.length === 0) {
      throw new ForestValidationError(
        `Corrupt recipe tree: step "${node.id}" (label ${JSON.stringify(node.label)}) has no children.`,
      )
    }

    const siblingIds = new Set<string>()
    for (const child of node.children) {
      if (siblingIds.has(child.id)) {
        throw new ForestValidationError(
          `Corrupt recipe tree: step "${node.id}" has duplicate child id "${child.id}".`,
        )
      }
      siblingIds.add(child.id)
      visit(child)
    }
  }

  const rootIds = new Set<string>()
  for (const node of nodes) {
    if (rootIds.has(node.id)) {
      throw new ForestValidationError(`Corrupt recipe tree: duplicate root id "${node.id}".`)
    }
    rootIds.add(node.id)
    visit(node)
  }
}

/**
 * Defensive repair for data that's already corrupt (e.g. saved by a buggy
 * server round-trip before this was caught) - drops any step that ends up
 * with zero children, bottom-up, so a step whose only children were
 * themselves dropped also gets dropped. Every Ingredient is kept
 * unconditionally: the user's ingredients must never disappear just because
 * the step structure around them was malformed.
 */
export function repairForest(nodes: RecipeNode[]): RecipeNode[] {
  let changed = false
  const result: RecipeNode[] = []
  for (const node of nodes) {
    if (node.kind === 'ingredient') {
      result.push(node)
      continue
    }
    const children = repairForest(node.children)
    if (children.length === 0) {
      changed = true
      if (import.meta.env.DEV) {
        console.warn(
          `[recipeGrid] Dropping corrupt step "${node.id}" (label ${JSON.stringify(node.label)}) - no children after repair.`,
        )
      }
      continue
    }
    if (children !== node.children) {
      changed = true
      result.push({ ...node, children })
    } else {
      result.push(node)
    }
  }
  // Preserve the input reference when nothing needed fixing - callers
  // (e.g. normalizeRecipePage) rely on that to avoid needless re-renders.
  return changed ? result : nodes
}
