import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryStore } from './CookbookStore'
import { ApiCookbookStore } from './ApiCookbookStore'
import type { CookbookStore } from './CookbookStore'

/**
 * These mirror exactly what React's useSyncExternalStore checks after every
 * render: getSnapshot() must return the SAME reference (Object.is) when
 * nothing changed, or it force-rerenders forever ("Maximum update depth
 * exceeded"). A mutation must still produce a genuinely new reference, or
 * components relying on it never see the update.
 */
function describeStoreStability(name: string, makeStore: () => CookbookStore) {
  describe(name, () => {
    let store: CookbookStore

    beforeEach(() => {
      store = makeStore()
    })

    it('getCategories() returns the identical reference across calls with no mutation', () => {
      expect(store.getCategories()).toBe(store.getCategories())
    })

    it('getCategories() returns a NEW reference after a mutation', () => {
      const before = store.getCategories()
      store.addCategory('New Category')
      expect(store.getCategories()).not.toBe(before)
    })

    it('getBookLayout() returns the identical reference across calls with no mutation', () => {
      const category = store.addCategory('Layout Test')
      expect(store.getBookLayout(category.id)).toBe(store.getBookLayout(category.id))
    })

    it('getBookLayout() returns the identical default reference for an unknown category across calls', () => {
      expect(store.getBookLayout('does-not-exist')).toBe(store.getBookLayout('does-not-exist'))
    })

    it('getBookLayout() returns a NEW reference after setBookLayout mutates it', () => {
      const category = store.addCategory('Layout Mutation Test')
      const before = store.getBookLayout(category.id)
      store.setBookLayout(category.id, { spreadWidth: 1500 })
      const after = store.getBookLayout(category.id)
      expect(after).not.toBe(before)
      expect(after.spreadWidth).toBe(1500)
    })

    it('getCategory() returns the identical reference across calls with no mutation', () => {
      const category = store.addCategory('Category Ref Test')
      expect(store.getCategory(category.id)).toBe(store.getCategory(category.id))
    })
  })
}

describeStoreStability('InMemoryStore', () => new InMemoryStore([]))

describe('ApiCookbookStore', () => {
  beforeEach(() => {
    // The store fires network requests it doesn't await synchronously
    // (background refresh); keep them from touching the real network or
    // spamming console.error for the unreachable relative URL in Node.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network disabled in test'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describeStoreStability('reference stability', () => new ApiCookbookStore())
})
