import type { AddImageInput, AddImageResult } from '../../store/CookbookStore'

/** Store actions for one recipe page, pre-bound to its categoryId/pageId by BookView. */
export type PageImageActions = {
  addImage: (input: AddImageInput) => AddImageResult
  removeImage: (imageId: string) => void
  updateCaption: (imageId: string, caption: string) => void
}
