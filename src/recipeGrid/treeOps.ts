import { createIngredient, createStep } from './factory'
import type { Ingredient, RecipeNode } from './types'

/** Recursively finds `id` and replaces it via `fn`, wherever it sits in the tree. */
function updateNode(
  nodes: RecipeNode[],
  id: string,
  fn: (node: RecipeNode) => RecipeNode,
): RecipeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return fn(node)
    if (node.kind === 'step')
      return { ...node, children: updateNode(node.children, id, fn) }
    return node
  })
}

export function addIngredient(nodes: RecipeNode[]): {
  nodes: RecipeNode[]
  id: string
} {
  const node = createIngredient()
  return { nodes: [...nodes, node], id: node.id }
}

export function updateIngredient(
  nodes: RecipeNode[],
  id: string,
  updates: Partial<Pick<Ingredient, 'amount' | 'name'>>,
): RecipeNode[] {
  return updateNode(nodes, id, (node) =>
    node.kind === 'ingredient' ? { ...node, ...updates } : node,
  )
}

export function renameStep(
  nodes: RecipeNode[],
  id: string,
  label: string,
): RecipeNode[] {
  return updateNode(nodes, id, (node) =>
    node.kind === 'step' ? { ...node, label } : node,
  )
}

/**
 * Removes a node wherever it is in the tree. If that empties a step's
 * children, the step collapses too - and that can cascade up through
 * however many ancestor steps it was nested in.
 */
export function removeNode(nodes: RecipeNode[], id: string): RecipeNode[] {
  const result: RecipeNode[] = []
  for (const node of nodes) {
    if (node.id === id) continue
    if (node.kind === 'ingredient') {
      result.push(node)
      continue
    }
    const children = removeNode(node.children, id)
    if (children.length === 0) continue
    result.push({ ...node, children })
  }
  return result
}

/** Swaps `id` with its previous/next sibling within whichever array holds it. */
export function moveSibling(
  nodes: RecipeNode[],
  id: string,
  direction: 'up' | 'down',
): RecipeNode[] {
  const idx = nodes.findIndex((node) => node.id === id)
  if (idx !== -1) {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= nodes.length) return nodes
    const copy = [...nodes]
    ;[copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]]
    return copy
  }
  return nodes.map((node) =>
    node.kind === 'step'
      ? { ...node, children: moveSibling(node.children, id, direction) }
      : node,
  )
}

/**
 * Combines one or more adjacent top-level nodes into one new step. A single
 * node is a legitimate case (e.g. butter -> "melt") - it just wraps that one
 * node in a step. `ids` must name contiguous root-level nodes (the UI only
 * enables Combine once selection satisfies that); anything else is a no-op.
 */
export function combineRoots(
  nodes: RecipeNode[],
  ids: string[],
): { nodes: RecipeNode[]; newStepId: string | null } {
  if (ids.length < 1) return { nodes, newStepId: null }

  const indices = ids.map((id) => nodes.findIndex((node) => node.id === id))
  if (indices.some((i) => i === -1)) return { nodes, newStepId: null }

  const sorted = [...indices].sort((a, b) => a - b)
  const isContiguous = sorted.every(
    (v, i) => i === 0 || v === sorted[i - 1] + 1,
  )
  if (!isContiguous) return { nodes, newStepId: null }

  const start = sorted[0]
  const end = sorted[sorted.length - 1]
  const step = createStep('', nodes.slice(start, end + 1))
  const newNodes = [...nodes.slice(0, start), step, ...nodes.slice(end + 1)]
  return { nodes: newNodes, newStepId: step.id }
}

/** Splices a step's children back into its parent, in place. No-op for an ingredient id. */
export function ungroupStep(nodes: RecipeNode[], stepId: string): RecipeNode[] {
  const idx = nodes.findIndex((node) => node.id === stepId)
  if (idx !== -1) {
    const node = nodes[idx]
    if (node.kind !== 'step') return nodes
    return [...nodes.slice(0, idx), ...node.children, ...nodes.slice(idx + 1)]
  }
  return nodes.map((node) =>
    node.kind === 'step'
      ? { ...node, children: ungroupStep(node.children, stepId) }
      : node,
  )
}
