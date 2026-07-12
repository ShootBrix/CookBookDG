export type RecipePage = {
  id: string
  title: string
  servings: string
  prepTime: string
  cookTime: string
  ovenTemp: string
  ingredients: string
  body: string
}

export type Category = {
  id: string
  name: string
  leather: number
  pages: RecipePage[]
}
