import { useCallback, useContext, useSyncExternalStore } from 'react'
import type { CookbookStore, PageSaveState } from './CookbookStore'
import { isPersistentStore } from './CookbookStore'
import { CookbookStoreContext } from './context'

/** Raw store instance - for code that needs synchronous, non-reactive reads
 * (e.g. checking every page's save state inside a keydown/beforeunload
 * handler). Prefer the more specific hooks below when rendering. */
export function useCookbookStore(): CookbookStore {
  const store = useContext(CookbookStoreContext)
  if (!store) {
    throw new Error('useCookbookStore must be used within a CookbookProvider')
  }
  return store
}

const useStore = useCookbookStore

/**
 * Dev-only early warning for the useSyncExternalStore footgun: getSnapshot
 * must return the SAME reference across calls until a real store mutation
 * happens, or React force-rerenders forever ("Maximum update depth
 * exceeded"). Wraps every getSnapshot passed to useSyncExternalStore below so
 * a regression in any store's getter - not just the one that bit us - gets
 * caught with a clear message instead of a bare React stack trace.
 *
 * `traceKey` should name the hook + the entity read (e.g.
 * `useBookLayout:${categoryId}`) so the warning points at the exact call
 * site. State is module-level (not per-render closure) since a fresh
 * getSnapshot function is legitimately created every render.
 */
const SNAPSHOT_UNSTABLE_THRESHOLD = 20
const lastSnapshotValues = new Map<string, unknown>()
const unstableStreaks = new Map<string, number>()
const warnedKeys = new Set<string>()

function devTraceSnapshot<T>(traceKey: string, getSnapshot: () => T): T {
  const value = getSnapshot()
  if (import.meta.env.DEV) {
    const hadLast = lastSnapshotValues.has(traceKey)
    const last = lastSnapshotValues.get(traceKey)
    if (hadLast && !Object.is(value, last)) {
      const streak = (unstableStreaks.get(traceKey) ?? 0) + 1
      unstableStreaks.set(traceKey, streak)
      if (streak === SNAPSHOT_UNSTABLE_THRESHOLD && !warnedKeys.has(traceKey)) {
        warnedKeys.add(traceKey)
        console.error(
          `[useCookbook] getSnapshot for "${traceKey}" returned a new reference ` +
            `${streak} times in a row with no store mutation in between. This will ` +
            `cause "Maximum update depth exceeded" in useSyncExternalStore - the ` +
            `store's getter must return a cached/stable reference until a real ` +
            `write happens (see getBookLayout's history in ApiCookbookStore.ts).`,
        )
      }
      // Streaks only matter within one burst of synchronous re-renders;
      // clear it once that burst has flushed.
      queueMicrotask(() => {
        unstableStreaks.set(traceKey, 0)
        warnedKeys.delete(traceKey)
      })
    } else {
      unstableStreaks.set(traceKey, 0)
    }
    lastSnapshotValues.set(traceKey, value)
  }
  return value
}

/** Reactive list of categories, kept in sync with the store. */
export function useCategories() {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => devTraceSnapshot('useCategories', () => store.getCategories()),
  )
}

/** Reactive single category, kept in sync with the store. */
export function useCategory(categoryId: string) {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => devTraceSnapshot(`useCategory:${categoryId}`, () => store.getCategory(categoryId)),
  )
}

/** Reactive book layout (spread size/ratio) for one category. */
export function useBookLayout(categoryId: string) {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => devTraceSnapshot(`useBookLayout:${categoryId}`, () => store.getBookLayout(categoryId)),
  )
}

/** Store action methods, for mutating cookbook data. */
export function useCookbookActions() {
  const store = useStore()
  return {
    addCategory: store.addCategory.bind(store),
    renameCategory: store.renameCategory.bind(store),
    deleteCategory: store.deleteCategory.bind(store),
    addPage: store.addPage.bind(store),
    updatePage: store.updatePage.bind(store),
    getBookLayout: store.getBookLayout.bind(store),
    setBookLayout: store.setBookLayout.bind(store),
    addImage: store.addImage.bind(store),
    removeImage: store.removeImage.bind(store),
    updateCaption: store.updateCaption.bind(store),
  }
}

const IDLE: PageSaveState = 'idle'

/** Draft/Save state for one open page's Save bar - always 'idle' for stores
 * that don't defer writes (see PersistentCookbookStore in CookbookStore.ts). */
export function usePageSaveState(pageId: string): PageSaveState {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () =>
      devTraceSnapshot(`usePageSaveState:${pageId}`, () =>
        isPersistentStore(store) ? store.getPageSaveState(pageId) : IDLE,
      ),
  )
}

export function usePageSaveError(pageId: string): string | undefined {
  const store = useStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () =>
      devTraceSnapshot(`usePageSaveError:${pageId}`, () =>
        isPersistentStore(store) ? store.getPageSaveError(pageId) : undefined,
      ),
  )
}

/** No-op for stores that don't defer writes - there's nothing to flush. */
export function useSavePage(): (categoryId: string, pageId: string) => Promise<void> {
  const store = useStore()
  return useCallback(
    (categoryId: string, pageId: string) =>
      isPersistentStore(store) ? store.savePage(categoryId, pageId) : Promise.resolve(),
    [store],
  )
}

export function useDiscardPageDraft(): (categoryId: string, pageId: string) => void {
  const store = useStore()
  return useCallback(
    (categoryId: string, pageId: string) => {
      if (isPersistentStore(store)) store.discardPageDraft(categoryId, pageId)
    },
    [store],
  )
}
