import type { RecipePage } from './types'

export function hasRecipeContent(page: RecipePage): boolean {
  return page.title.trim() !== '' || page.body.trim() !== ''
}

export function countRecipes(pages: RecipePage[]): number {
  return pages.filter(hasRecipeContent).length
}
