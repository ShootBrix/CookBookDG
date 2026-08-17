import type { Ingredient, RecipeNode, Step } from './types'

/**
 * Node ids are real UUIDs (not a counter scheme) so the ApiCookbookStore can
 * treat client-generated ids as authoritative - a node created locally and
 * one round-tripped through the backend share the same id, no reconciliation
 * needed once a page save succeeds.
 */
function nextId(): string {
  return crypto.randomUUID()
}

export function createIngredient(amount = '', name = ''): Ingredient {
  return { id: nextId(), kind: 'ingredient', amount, name }
}

export function createStep(label: string, children: RecipeNode[]): Step {
  return { id: nextId(), kind: 'step', label, children }
}
