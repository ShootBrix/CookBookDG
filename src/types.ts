export type RecipePage = {
  id: string
  title: string
  body: string
}

export type Category = {
  id: string
  name: string
  leather: number
  pages: RecipePage[]
}
