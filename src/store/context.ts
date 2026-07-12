import { createContext } from 'react'
import type { CookbookStore } from './CookbookStore'
import { InMemoryStore } from './CookbookStore'

export const CookbookStoreContext = createContext<CookbookStore | null>(null)

export const defaultStore: CookbookStore = new InMemoryStore()
