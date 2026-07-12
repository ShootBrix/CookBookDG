import type { ReactNode } from 'react'
import type { CookbookStore } from './CookbookStore'
import { CookbookStoreContext, defaultStore } from './context'

type CookbookProviderProps = {
  store?: CookbookStore
  children: ReactNode
}

export function CookbookProvider({ store, children }: CookbookProviderProps) {
  const instance = store ?? defaultStore
  return (
    <CookbookStoreContext.Provider value={instance}>
      {children}
    </CookbookStoreContext.Provider>
  )
}
