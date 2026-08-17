export type { Ingredient, RecipeNode, Step } from './recipeGrid/types'

import type { RecipeNode } from './recipeGrid/types'

/** A downscaled, re-encoded photo attached to a recipe page (max 2 per page). */
export type RecipeImage = {
  id: string
  /**
   * Src to render - `/api/images/{id}` once persisted (see src/imageProcessing.ts
   * for the client-side downscale pipeline that runs before upload). May briefly
   * be a local blob: URL for an optimistic add that hasn't confirmed yet.
   */
  url: string
  caption: string
  width: number
  height: number
  bytes: number
}

export type RecipePage = {
  id: string
  title: string
  servings: string
  prepTime: string
  cookTime: string
  ovenTemp: string
  /** Full-width steps above the grid, not tied to any ingredient. */
  setup: string[]
  /** Ordered forest; ingredient rows are exactly its leaves, in order. */
  nodes: RecipeNode[]
  images: RecipeImage[]
  /** Free-text ruled area below the grid. */
  notes: string
}

export type Category = {
  id: string
  /** URL-friendly identifier for /book/:slug - see Category.Slug on the API
   * side for how it's generated and why it never changes on rename. */
  slug: string
  name: string
  leather: number
  pages: RecipePage[]
  /**
   * Server-computed recipe count for stores that don't eagerly load every
   * book's page graph (ApiCookbookStore - see GET /api/categories). When
   * unset, callers should derive the count from `pages` instead (see
   * recipeUtils.displayRecipeCount).
   */
  recipeCount?: number
}
