import { createContext } from 'react'
import type { CookbookStore } from './CookbookStore'
import { ApiCookbookStore } from './ApiCookbookStore'

export const CookbookStoreContext = createContext<CookbookStore | null>(null)

// InMemoryStore remains available (see CookbookStore.ts) for tests or an
// offline mode later - the API-backed store is what the app runs against.
export const defaultStore: CookbookStore = new ApiCookbookStore()
