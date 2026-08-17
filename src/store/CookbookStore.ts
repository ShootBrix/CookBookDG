import type { Category, RecipeImage, RecipePage } from '../types'
import { createIngredient, createStep } from '../recipeGrid/factory'
import { normalizeRecipePage } from '../recipeGrid/migrate'
import { generateUniqueSlug } from '../slug'

/**
 * Abstraction over cookbook persistence. Components never touch the
 * underlying data structure directly - only through this interface, so the
 * backing implementation can move from in-memory to localStorage to a
 * real API without touching any component code.
 */
export type RecipePageUpdate = Partial<Omit<RecipePage, 'id'>>

/** Per-book spread sizing, adjustable by dragging in the book view. */
export type BookLayout = {
  spreadWidth: number
  spreadHeight: number
  /** Fraction of spread width given to the visually-left page (0.3-0.7). */
  pageRatio: number
}

export const MAX_IMAGES_PER_PAGE = 2

/**
 * Conservative stand-in for the real storage quota. Recipe content today
 * lives in memory only (see README "Known limitations"), so this can't yet
 * check an actual browser/blob-storage quota - it caps the total image
 * payload at a size that would comfortably fit once persistence lands.
 */
export const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024

/**
 * What callers hand the store to add a photo: the client-downscaled data URL
 * (see src/imageProcessing.ts), not the final `url` a persisted RecipeImage
 * renders from - the store decides how that data URL becomes a displayable
 * `url` (inline for InMemoryStore, an uploaded `/api/images/{id}` for
 * ApiCookbookStore).
 */
export type AddImageInput = {
  dataUrl: string
  caption: string
  width: number
  height: number
  bytes: number
}
export type AddImageFailureReason =
  'limit-reached' | 'quota-exceeded' | 'not-found'
export type AddImageResult =
  | { ok: true; image: RecipeImage }
  | { ok: false; reason: AddImageFailureReason }

export interface CookbookStore {
  getCategories(): Category[]
  getCategory(categoryId: string): Category | undefined
  addCategory(name: string): Category
  renameCategory(categoryId: string, name: string): void
  deleteCategory(categoryId: string): void
  addPage(categoryId: string): RecipePage | undefined
  updatePage(
    categoryId: string,
    pageId: string,
    updates: RecipePageUpdate,
  ): void
  getBookLayout(categoryId: string): BookLayout
  setBookLayout(categoryId: string, updates: Partial<BookLayout>): void
  /**
   * Image reads/writes are routed through the store (never touched directly
   * by components) so that swapping data URLs for blob storage / object URLs
   * behind a real backend later only changes these three methods.
   */
  addImage(
    categoryId: string,
    pageId: string,
    input: AddImageInput,
  ): AddImageResult
  removeImage(categoryId: string, pageId: string, imageId: string): void
  updateCaption(
    categoryId: string,
    pageId: string,
    imageId: string,
    caption: string,
  ): void
  subscribe(listener: () => void): () => void
}

/** Draft-vs-saved state for one open page's Save bar. */
export type PageSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/**
 * Superset of CookbookStore implemented only by stores that defer writes
 * behind an explicit Save (today, just ApiCookbookStore). Kept separate from
 * CookbookStore itself so that interface - and every existing component call
 * site against it - stays untouched; UI that wants Save-bar behavior checks
 * for these methods rather than assuming every store has them.
 */
export interface PersistentCookbookStore extends CookbookStore {
  getPageSaveState(pageId: string): PageSaveState
  getPageSaveError(pageId: string): string | undefined
  savePage(categoryId: string, pageId: string): Promise<void>
  discardPageDraft(categoryId: string, pageId: string): void
}

export function isPersistentStore(
  store: CookbookStore,
): store is PersistentCookbookStore {
  return 'savePage' in store
}

/** True if any loaded page across any category has unsaved edits (dirty) or
 * a failed save (error) - used by the crash screen (see AppErrorBoundary) so
 * it never implies work is safe when it isn't. Stores that don't defer
 * writes (InMemoryStore) have nothing to lose, so always false there. */
export function anyUnsavedChanges(store: CookbookStore): boolean {
  if (!isPersistentStore(store)) return false
  for (const category of store.getCategories()) {
    for (const page of category.pages) {
      const state = store.getPageSaveState(page.id)
      if (state === 'dirty' || state === 'error') return true
    }
  }
  return false
}

/** Attempts to save every dirty/error page across every category - the crash
 * screen's "Retry save" action, which (unlike BookView's save-all) can't
 * scope itself to one open book since the crash may have happened anywhere.
 * Resolves true only if every save succeeded. */
export async function saveAllUnsavedChanges(store: CookbookStore): Promise<boolean> {
  if (!isPersistentStore(store)) return true
  const targets: Array<{ categoryId: string; pageId: string }> = []
  for (const category of store.getCategories()) {
    for (const page of category.pages) {
      const state = store.getPageSaveState(page.id)
      if (state === 'dirty' || state === 'error') {
        targets.push({ categoryId: category.id, pageId: page.id })
      }
    }
  }
  const results = await Promise.allSettled(
    targets.map(({ categoryId, pageId }) => store.savePage(categoryId, pageId)),
  )
  return results.every((r) => r.status === 'fulfilled')
}

export const LEATHER_COUNT = 6

export const DEFAULT_BOOK_LAYOUT: BookLayout = {
  spreadWidth: 1400,
  spreadHeight: 640,
  pageRatio: 0.5,
}

export const BOOK_LAYOUT_LIMITS = {
  minSpreadWidth: 900,
  maxSpreadWidth: 2000,
  minSpreadHeight: 480,
  maxSpreadHeight: 900,
  minPageRatio: 0.3,
  maxPageRatio: 0.7,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampLayout(layout: BookLayout): BookLayout {
  return {
    spreadWidth: clamp(
      layout.spreadWidth,
      BOOK_LAYOUT_LIMITS.minSpreadWidth,
      BOOK_LAYOUT_LIMITS.maxSpreadWidth,
    ),
    spreadHeight: clamp(
      layout.spreadHeight,
      BOOK_LAYOUT_LIMITS.minSpreadHeight,
      BOOK_LAYOUT_LIMITS.maxSpreadHeight,
    ),
    pageRatio: clamp(
      layout.pageRatio,
      BOOK_LAYOUT_LIMITS.minPageRatio,
      BOOK_LAYOUT_LIMITS.maxPageRatio,
    ),
  }
}

const BOOK_LAYOUT_STORAGE_KEY = 'cbdg:bookLayout:v1'

function loadBookLayouts(): Map<string, BookLayout> {
  if (typeof localStorage === 'undefined') return new Map()
  try {
    const raw = localStorage.getItem(BOOK_LAYOUT_STORAGE_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as Record<string, BookLayout>
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

function saveBookLayouts(layouts: Map<string, BookLayout>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      BOOK_LAYOUT_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(layouts)),
    )
  } catch {
    // Ignore quota/serialization errors - layout persistence is best-effort.
  }
}

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`
}

function makeBlankPage(): RecipePage {
  return {
    id: nextId('page'),
    title: '',
    servings: '',
    prepTime: '',
    cookTime: '',
    ovenTemp: '',
    setup: [],
    nodes: [],
    images: [],
    notes: '',
  }
}

/** Sample recipe seeded so the structured grid is visible on first run. */
function makeSampleSkilletChickenPage(): RecipePage {
  const sear = createStep('Sear until golden, 3-4 min per side', [
    createIngredient('4', 'bone-in chicken thighs'),
    createIngredient('1 tbsp', 'olive oil'),
  ])
  const soften = createStep('Soften in the drippings, 4 min', [
    createIngredient('1', 'yellow onion, diced'),
    createIngredient('3 cloves', 'garlic, minced'),
  ])
  const combineAndToast = createStep('Combine and toast rice, 2 min', [
    sear,
    soften,
    createIngredient('1 cup', 'long-grain rice'),
  ])
  const simmer = createStep('Simmer, covered, 18 min', [
    combineAndToast,
    createIngredient('2 cups', 'chicken broth'),
  ])
  const restAndServe = createStep('Rest 5 min, then serve', [
    simmer,
    createIngredient('1', 'lemon, quartered'),
  ])

  return {
    id: nextId('page'),
    title: 'Skillet Chicken and Rice',
    servings: '4',
    prepTime: '15 min',
    cookTime: '35 min',
    ovenTemp: '425°F',
    setup: [
      'Preheat oven to 425°F (220°C).',
      'Season chicken thighs generously with salt and pepper.',
    ],
    nodes: [restAndServe],
    images: [],
    notes:
      'Swap broth for stock as needed. Leftovers keep 3 days refrigerated.',
  }
}

const SEED_CATEGORIES: Category[] = [
  {
    id: 'meat',
    slug: 'meat',
    name: 'Meat',
    leather: 0,
    pages: [makeSampleSkilletChickenPage(), makeBlankPage()],
  },
  {
    id: 'bread',
    slug: 'bread',
    name: 'Bread',
    leather: 1,
    pages: [makeBlankPage(), makeBlankPage()],
  },
  {
    id: 'keto',
    slug: 'keto',
    name: 'Keto',
    leather: 2,
    pages: [makeBlankPage(), makeBlankPage()],
  },
]

export class InMemoryStore implements CookbookStore {
  private categories: Category[]
  private listeners = new Set<() => void>()
  private bookLayouts: Map<string, BookLayout>

  constructor(seed: Category[] = SEED_CATEGORIES) {
    this.categories = seed.map((category) => ({
      ...category,
      pages: category.pages.map(normalizeRecipePage),
    }))
    this.bookLayouts = loadBookLayouts()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  getCategories(): Category[] {
    return this.categories
  }

  /** Accepts either a category's id or its slug - see Category.slug. */
  getCategory(identifier: string): Category | undefined {
    return this.categories.find(
      (c) => c.id === identifier || c.slug === identifier,
    )
  }

  addCategory(name: string): Category {
    const id = nextId('cat')
    const slug = generateUniqueSlug(name, id, (candidate) =>
      this.categories.some((c) => c.slug === candidate),
    )
    const category: Category = {
      id,
      slug,
      name,
      leather: this.categories.length % LEATHER_COUNT,
      pages: [makeBlankPage(), makeBlankPage()],
    }
    this.categories = [...this.categories, category]
    this.notify()
    return category
  }

  renameCategory(categoryId: string, name: string): void {
    const trimmed = name.trim()
    this.categories = this.categories.map((c) =>
      c.id === categoryId ? { ...c, name: trimmed } : c,
    )
    this.notify()
  }

  deleteCategory(categoryId: string): void {
    this.categories = this.categories.filter((c) => c.id !== categoryId)
    if (this.bookLayouts.delete(categoryId)) saveBookLayouts(this.bookLayouts)
    this.notify()
  }

  addPage(categoryId: string): RecipePage | undefined {
    const category = this.getCategory(categoryId)
    if (!category) return undefined

    const page = makeBlankPage()
    this.categories = this.categories.map((c) =>
      c.id === categoryId ? { ...c, pages: [...c.pages, page] } : c,
    )
    this.notify()
    return page
  }

  updatePage(
    categoryId: string,
    pageId: string,
    updates: RecipePageUpdate,
  ): void {
    this.categories = this.categories.map((c) => {
      if (c.id !== categoryId) return c
      return {
        ...c,
        pages: c.pages.map((p) => (p.id === pageId ? { ...p, ...updates } : p)),
      }
    })
    this.notify()
  }

  private totalImageBytes(): number {
    let total = 0
    for (const category of this.categories) {
      for (const page of category.pages) {
        for (const image of page.images) total += image.bytes
      }
    }
    return total
  }

  addImage(
    categoryId: string,
    pageId: string,
    input: AddImageInput,
  ): AddImageResult {
    const page = this.getCategory(categoryId)?.pages.find(
      (p) => p.id === pageId,
    )
    if (!page) return { ok: false, reason: 'not-found' }
    if (page.images.length >= MAX_IMAGES_PER_PAGE) {
      return { ok: false, reason: 'limit-reached' }
    }
    if (this.totalImageBytes() + input.bytes > MAX_TOTAL_IMAGE_BYTES) {
      return { ok: false, reason: 'quota-exceeded' }
    }

    const image: RecipeImage = {
      id: nextId('img'),
      url: input.dataUrl,
      caption: input.caption,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
    }
    this.categories = this.categories.map((c) => {
      if (c.id !== categoryId) return c
      return {
        ...c,
        pages: c.pages.map((p) =>
          p.id === pageId ? { ...p, images: [...p.images, image] } : p,
        ),
      }
    })
    this.notify()
    return { ok: true, image }
  }

  removeImage(categoryId: string, pageId: string, imageId: string): void {
    this.categories = this.categories.map((c) => {
      if (c.id !== categoryId) return c
      return {
        ...c,
        pages: c.pages.map((p) =>
          p.id === pageId
            ? { ...p, images: p.images.filter((img) => img.id !== imageId) }
            : p,
        ),
      }
    })
    this.notify()
  }

  updateCaption(
    categoryId: string,
    pageId: string,
    imageId: string,
    caption: string,
  ): void {
    this.categories = this.categories.map((c) => {
      if (c.id !== categoryId) return c
      return {
        ...c,
        pages: c.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                images: p.images.map((img) =>
                  img.id === imageId ? { ...img, caption } : img,
                ),
              }
            : p,
        ),
      }
    })
    this.notify()
  }

  getBookLayout(categoryId: string): BookLayout {
    return this.bookLayouts.get(categoryId) ?? DEFAULT_BOOK_LAYOUT
  }

  setBookLayout(categoryId: string, updates: Partial<BookLayout>): void {
    const next = clampLayout({ ...this.getBookLayout(categoryId), ...updates })
    this.bookLayouts.set(categoryId, next)
    saveBookLayouts(this.bookLayouts)
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
