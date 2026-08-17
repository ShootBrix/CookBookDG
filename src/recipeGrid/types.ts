export type Ingredient = {
  id: string
  kind: 'ingredient'
  amount: string
  name: string
}

export type Step = {
  id: string
  kind: 'step'
  label: string
  children: RecipeNode[]
}

export type RecipeNode = Ingredient | Step
