import { createIngredient } from './factory'
import type { RecipeNode } from './types'
import type { RecipePage } from '../types'
import { repairForest } from './validate'

/** Shape recipe pages used before the structured ingredients/steps grid. */
export type LegacyRecipePage = {
  id: string
  title: string
  servings: string
  prepTime: string
  cookTime: string
  ovenTemp: string
  ingredients: string
  body: string
}

/**
 * Splits free-text ingredients into one ingredient row per line (whole line
 * goes into `name`, `amount` stays blank) and carries `body` verbatim into
 * `notes`. Nothing is dropped; `setup` and `nodes`/steps simply start empty.
 */
export function migrateRecipePage(legacy: LegacyRecipePage): RecipePage {
  const nodes: RecipeNode[] = legacy.ingredients
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => createIngredient('', line))

  return {
    id: legacy.id,
    title: legacy.title,
    servings: legacy.servings,
    prepTime: legacy.prepTime,
    cookTime: legacy.cookTime,
    ovenTemp: legacy.ovenTemp,
    setup: [],
    nodes,
    images: [],
    notes: legacy.body,
  }
}

export function normalizeRecipePage(
  page: RecipePage | LegacyRecipePage,
): RecipePage {
  if ('nodes' in page) {
    const typed = page as RecipePage
    // Pages saved before the images feature existed have `nodes` but no `images`.
    const hasImages = Array.isArray(typed.images)
    const repairedNodes = repairForest(typed.nodes)
    if (hasImages && repairedNodes === typed.nodes) return typed
    return {
      ...typed,
      nodes: repairedNodes,
      images: hasImages ? typed.images : [],
    }
  }
  return migrateRecipePage(page)
}
