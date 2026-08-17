import type { Category, RecipePage } from './types'

export function hasRecipeContent(page: RecipePage): boolean {
  return (
    page.title.trim() !== '' ||
    page.notes.trim() !== '' ||
    page.setup.some((line) => line.trim() !== '') ||
    page.nodes.length > 0 ||
    page.images.length > 0
  )
}

export function countRecipes(pages: RecipePage[]): number {
  return pages.filter(hasRecipeContent).length
}

/** Prefers a store-supplied count (ApiCookbookStore, whose pages load lazily)
 * over deriving one from `pages`, which may not be loaded yet. */
export function displayRecipeCount(category: Category): number {
  return category.recipeCount ?? countRecipes(category.pages)
}
