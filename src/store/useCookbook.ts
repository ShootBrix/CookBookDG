import { useContext, useSyncExternalStore } from 'react'
import type { CookbookStore } from './CookbookStore'
import { CookbookStoreContext } from './context'

function useStore(): CookbookStore {
  const store = useContext(CookbookStoreContext)
  if (!store) {
    throw new Error('useStore must be used within a CookbookProvider')
  }
  return store
}

/** Reactive list of categories, kept in sync with the store. */
export function useCategories() {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getCategories(),
  )
}

/** Reactive single category, kept in sync with the store. */
export function useCategory(categoryId: string) {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getCategory(categoryId),
  )
}

/** Store action methods, for mutating cookbook data. */
export function useCookbookActions() {
  const store = useStore()
  return {
    addCategory: store.addCategory.bind(store),
    addPage: store.addPage.bind(store),
    updatePage: store.updatePage.bind(store),
  }
}
