import type { Category, RecipeImage, RecipeNode, RecipePage } from '../types'
import { countRecipes } from '../recipeUtils'
import { slugify } from '../slug'
import { repairForest } from '../recipeGrid/validate'
import { clampLayout, DEFAULT_BOOK_LAYOUT, MAX_IMAGES_PER_PAGE } from './CookbookStore'
import type {
  AddImageInput,
  AddImageResult,
  BookLayout,
  PageSaveState,
  PersistentCookbookStore,
  RecipePageUpdate,
} from './CookbookStore'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

// --- wire DTOs (mirror api/Dtos/*.cs) ---------------------------------------

type BookLayoutDto = { spreadWidth: number; spreadHeight: number; pageRatio: number }

type CategoryDto = {
  id: string
  slug: string
  name: string
  leather: number
  ordinal: number
  recipeCount: number
  layout: BookLayoutDto
  updatedAt: string
}

type RecipeNodeDto = {
  id: string
  kind: 'ingredient' | 'step'
  amount: string | null
  name: string | null
  label: string | null
  children: RecipeNodeDto[] | null
}

type RecipeImageDto = {
  id: string
  caption: string
  width: number
  height: number
  bytes: number
}

type PageDto = {
  id: string
  categoryId: string
  ordinal: number
  title: string
  servings: string
  prepTime: string
  cookTime: string
  ovenTemp: string
  notes: string
  setup: string[]
  nodes: RecipeNodeDto[]
  images: RecipeImageDto[]
  updatedAt: string
}

type ProblemDetails = { title?: string; detail?: string; status?: number }

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const problem = (await res.json()) as ProblemDetails
      message = problem.detail ?? problem.title ?? message
    } catch {
      // body wasn't ProblemDetails JSON - fall back to the generic message
    }
    throw new ApiError(message, res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// --- DTO <-> frontend model mapping -----------------------------------------

function nodeFromDto(dto: RecipeNodeDto): RecipeNode {
  if (dto.kind === 'step') {
    return {
      id: dto.id,
      kind: 'step',
      label: dto.label ?? '',
      children: (dto.children ?? []).map(nodeFromDto),
    }
  }
  return { id: dto.id, kind: 'ingredient', amount: dto.amount ?? '', name: dto.name ?? '' }
}

function nodeToDto(node: RecipeNode): RecipeNodeDto {
  if (node.kind === 'step') {
    return {
      id: node.id,
      kind: 'step',
      amount: null,
      name: null,
      label: node.label,
      children: node.children.map(nodeToDto),
    }
  }
  return { id: node.id, kind: 'ingredient', amount: node.amount, name: node.name, label: null, children: null }
}

function imageFromDto(dto: RecipeImageDto): RecipeImage {
  return {
    id: dto.id,
    url: `${API_BASE}/images/${dto.id}`,
    caption: dto.caption,
    width: dto.width,
    height: dto.height,
    bytes: dto.bytes,
  }
}

function pageFromDto(dto: PageDto): RecipePage {
  return {
    id: dto.id,
    title: dto.title,
    servings: dto.servings,
    prepTime: dto.prepTime,
    cookTime: dto.cookTime,
    ovenTemp: dto.ovenTemp,
    setup: dto.setup,
    // Defensive repair, not just a dev assertion - a page loaded from the
    // API is untrusted input regardless of build mode (see recipeGrid/validate.ts).
    nodes: repairForest(dto.nodes.map(nodeFromDto)),
    images: dto.images.map(imageFromDto),
    notes: dto.notes,
  }
}

/** What actually gets compared for dirty tracking - excludes image add/remove
 * (those hit the network immediately via their own endpoints, see addImage/
 * removeImage below) but includes caption text, which only saves via the
 * whole-page PUT. */
function draftSignature(page: RecipePage): string {
  return JSON.stringify({
    title: page.title,
    servings: page.servings,
    prepTime: page.prepTime,
    cookTime: page.cookTime,
    ovenTemp: page.ovenTemp,
    notes: page.notes,
    setup: page.setup,
    nodes: page.nodes,
    imageCaptions: page.images.map((img) => ({ id: img.id, caption: img.caption })),
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const SAVE_FLASH_MS = 1500
const LAYOUT_SAVE_DEBOUNCE_MS = 500

/**
 * CookbookStore backed by the .NET API. Reads (getCategories/getCategory) are
 * synchronous against a local cache, same as InMemoryStore - network fetches
 * are kicked off in the background and update the cache via notify().
 *
 * Content edits (title, nodes, notes, setup, captions) only touch the local
 * draft; they're persisted by an explicit savePage() call (wired to the Save
 * bar), tracked against a per-page "last saved" snapshot. Image add/remove
 * and book-layout changes hit the network immediately - see the class doc on
 * each method for why.
 */
export class ApiCookbookStore implements PersistentCookbookStore {
  private categories: Category[] = []
  private listeners = new Set<() => void>()

  private categoriesLoaded = false
  private loadedPageSets = new Set<string>()
  private loadingPageSets = new Set<string>()
  private layouts = new Map<string, BookLayoutDto>()

  private snapshots = new Map<string, RecipePage>()
  private pageUpdatedAt = new Map<string, string>()
  private saveStates = new Map<string, PageSaveState>()
  private saveErrors = new Map<string, string>()
  private inFlightSaves = new Map<string, Promise<void>>()
  private layoutSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor() {
    void this.loadCategories()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  private updateCategory(categoryId: string, fn: (c: Category) => Category): void {
    this.categories = this.categories.map((c) => (c.id === categoryId ? fn(c) : c))
  }

  private updatePageInPlace(
    categoryId: string,
    pageId: string,
    fn: (p: RecipePage) => RecipePage,
  ): void {
    this.updateCategory(categoryId, (c) => ({
      ...c,
      pages: c.pages.map((p) => (p.id === pageId ? fn(p) : p)),
    }))
  }

  private async loadCategories(): Promise<void> {
    try {
      const dtos = await apiFetch<CategoryDto[]>('/categories')
      this.categories = dtos.map((dto) => ({
        id: dto.id,
        slug: dto.slug,
        name: dto.name,
        leather: dto.leather,
        pages: [],
        recipeCount: dto.recipeCount,
      }))
      for (const dto of dtos) this.layouts.set(dto.id, dto.layout)
      this.categoriesLoaded = true
      this.notify()
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  private ensurePagesLoaded(categoryId: string): void {
    if (this.loadedPageSets.has(categoryId) || this.loadingPageSets.has(categoryId)) return
    this.loadingPageSets.add(categoryId)
    void this.loadPages(categoryId)
  }

  private async loadPages(categoryId: string): Promise<void> {
    try {
      const dtos = await apiFetch<PageDto[]>(`/categories/${categoryId}/pages`)
      const pages = dtos.map(pageFromDto)
      for (let i = 0; i < dtos.length; i++) {
        this.snapshots.set(dtos[i].id, structuredClone(pages[i]))
        this.pageUpdatedAt.set(dtos[i].id, dtos[i].updatedAt)
        this.saveStates.set(dtos[i].id, 'idle')
      }
      this.updateCategory(categoryId, (c) => ({ ...c, pages }))
      this.loadedPageSets.add(categoryId)
      this.refreshRecipeCount(categoryId)
      this.notify()
    } catch (err) {
      console.error('Failed to load pages', err)
    } finally {
      this.loadingPageSets.delete(categoryId)
    }
  }

  getCategories(): Category[] {
    return this.categories
  }

  /** Accepts either a category's id or its slug - see Category.slug. Always
   * resolves to the real id before touching id-keyed state (loadedPageSets,
   * layouts, ...), since those are populated by real id regardless of which
   * form the caller looked it up by. */
  getCategory(identifier: string): Category | undefined {
    const category = this.categories.find(
      (c) => c.id === identifier || c.slug === identifier,
    )
    if (category && this.categoriesLoaded) this.ensurePagesLoaded(category.id)
    return category
  }

  addCategory(name: string): Category {
    const id = crypto.randomUUID()
    // Best-effort local guess so the optimistic insert has *a* slug to
    // navigate to immediately; the server is the source of truth (it also
    // handles collisions) and the .then() below reconciles once it responds.
    const slug = slugify(name) || id
    const category: Category = { id, slug, name, leather: this.categories.length % 6, pages: [] }
    this.categories = [...this.categories, category]
    this.layouts.set(id, DEFAULT_BOOK_LAYOUT)
    this.loadedPageSets.add(id) // brand new - no pages to fetch
    this.notify()

    apiFetch<CategoryDto>('/categories', {
      method: 'POST',
      body: JSON.stringify({ id, name }),
    })
      .then((dto) => {
        this.updateCategory(id, (c) => ({ ...c, slug: dto.slug, name: dto.name, leather: dto.leather }))
        this.layouts.set(id, dto.layout)
        this.notify()
      })
      .catch((err: unknown) => {
        console.error('Failed to create category', err)
        this.categories = this.categories.filter((c) => c.id !== id)
        this.notify()
      })

    return category
  }

  /** Optimistic like addCategory/deleteCategory - the slug is deliberately
   * never touched here, matching UpdateCategoryDto's handling server-side. */
  renameCategory(categoryId: string, name: string): void {
    const trimmed = name.trim()
    const previous = this.categories.find((c) => c.id === categoryId)?.name
    this.updateCategory(categoryId, (c) => ({ ...c, name: trimmed }))
    this.notify()

    apiFetch<CategoryDto>(`/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: trimmed }),
    }).catch((err: unknown) => {
      console.error('Failed to rename category', err)
      if (previous !== undefined) {
        this.updateCategory(categoryId, (c) => ({ ...c, name: previous }))
        this.notify()
      }
    })
  }

  deleteCategory(categoryId: string): void {
    this.categories = this.categories.filter((c) => c.id !== categoryId)
    this.layouts.delete(categoryId)
    this.notify()

    apiFetch<void>(`/categories/${categoryId}`, { method: 'DELETE' }).catch((err: unknown) => {
      console.error('Failed to delete category', err)
    })
  }

  addPage(categoryId: string): RecipePage | undefined {
    const category = this.getCategory(categoryId)
    if (!category) return undefined

    const id = crypto.randomUUID()
    const page: RecipePage = {
      id,
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
    this.snapshots.set(id, structuredClone(page))
    this.saveStates.set(id, 'idle')
    this.updateCategory(categoryId, (c) => ({ ...c, pages: [...c.pages, page] }))
    this.notify()

    apiFetch<PageDto>(`/categories/${categoryId}/pages`, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
      .then((dto) => {
        this.pageUpdatedAt.set(id, dto.updatedAt)
      })
      .catch((err: unknown) => {
        console.error('Failed to create page', err)
        this.snapshots.delete(id)
        this.saveStates.delete(id)
        this.updateCategory(categoryId, (c) => ({
          ...c,
          pages: c.pages.filter((p) => p.id !== id),
        }))
        this.notify()
      })

    return page
  }

  updatePage(categoryId: string, pageId: string, updates: RecipePageUpdate): void {
    this.updatePageInPlace(categoryId, pageId, (p) => ({ ...p, ...updates }))
    this.recomputeDirty(pageId)
    this.notify()
  }

  private recomputeDirty(pageId: string): void {
    if (this.saveStates.get(pageId) === 'saving') return
    const snapshot = this.snapshots.get(pageId)
    const draft = this.findPage(pageId)
    if (!snapshot || !draft) return
    const dirty = draftSignature(draft) !== draftSignature(snapshot)
    this.saveStates.set(pageId, dirty ? 'dirty' : 'idle')
    if (!dirty) this.saveErrors.delete(pageId)
  }

  /** Keeps the shelf's recipe count fresh once a category's pages have been
   * loaded this session (see Category.recipeCount doc in types.ts). */
  private refreshRecipeCount(categoryId: string): void {
    if (!this.loadedPageSets.has(categoryId)) return
    const category = this.categories.find((c) => c.id === categoryId)
    if (!category) return
    this.updateCategory(categoryId, (c) => ({ ...c, recipeCount: countRecipes(c.pages) }))
  }

  private findPage(pageId: string): RecipePage | undefined {
    for (const category of this.categories) {
      const page = category.pages.find((p) => p.id === pageId)
      if (page) return page
    }
    return undefined
  }

  getPageSaveState(pageId: string): PageSaveState {
    return this.saveStates.get(pageId) ?? 'idle'
  }

  getPageSaveError(pageId: string): string | undefined {
    return this.saveErrors.get(pageId)
  }

  discardPageDraft(categoryId: string, pageId: string): void {
    const snapshot = this.snapshots.get(pageId)
    if (!snapshot) return
    this.updatePageInPlace(categoryId, pageId, () => structuredClone(snapshot))
    this.saveStates.set(pageId, 'idle')
    this.saveErrors.delete(pageId)
    this.notify()
  }

  async savePage(categoryId: string, pageId: string): Promise<void> {
    const existing = this.inFlightSaves.get(pageId)
    if (existing) return existing

    const promise = this.doSavePage(categoryId, pageId)
    this.inFlightSaves.set(pageId, promise)
    try {
      await promise
    } finally {
      this.inFlightSaves.delete(pageId)
    }
  }

  private async doSavePage(categoryId: string, pageId: string): Promise<void> {
    const draft = this.findPage(pageId)
    if (!draft) return

    this.saveStates.set(pageId, 'saving')
    this.saveErrors.delete(pageId)
    this.notify()

    try {
      const dto = await apiFetch<PageDto>(`/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: draft.title,
          servings: draft.servings,
          prepTime: draft.prepTime,
          cookTime: draft.cookTime,
          ovenTemp: draft.ovenTemp,
          notes: draft.notes,
          setup: draft.setup,
          nodes: draft.nodes.map(nodeToDto),
          imageCaptions: draft.images.map((img) => ({ id: img.id, caption: img.caption })),
          updatedAt: this.pageUpdatedAt.get(pageId) ?? new Date(0).toISOString(),
        }),
      })

      const saved = pageFromDto(dto)
      this.pageUpdatedAt.set(pageId, dto.updatedAt)
      this.snapshots.set(pageId, structuredClone(saved))
      this.updatePageInPlace(categoryId, pageId, () => saved)
      this.refreshRecipeCount(categoryId)
      this.saveStates.set(pageId, 'saved')
      this.notify()

      setTimeout(() => {
        if (this.saveStates.get(pageId) === 'saved') {
          this.saveStates.set(pageId, 'idle')
          this.notify()
        }
      }, SAVE_FLASH_MS)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      this.saveErrors.set(pageId, message)
      this.saveStates.set(pageId, 'error')
      this.notify()
      throw err
    }
  }

  /**
   * Uploads immediately (binary content can't ride in the page's JSON PUT -
   * see api/Endpoints/ImagesEndpoints.cs). The optimistic insert updates both
   * the draft *and* the snapshot in lockstep so a successful add never shows
   * as a pending page edit; a failed upload rolls the insert back out of
   * both. Caption text is the only per-image field that participates in the
   * page draft/Save cycle (no dedicated caption endpoint exists).
   */
  addImage(categoryId: string, pageId: string, input: AddImageInput): AddImageResult {
    const page = this.findPage(pageId)
    if (!page) return { ok: false, reason: 'not-found' }
    if (page.images.length >= MAX_IMAGES_PER_PAGE) return { ok: false, reason: 'limit-reached' }

    const image: RecipeImage = {
      id: crypto.randomUUID(),
      url: input.dataUrl,
      caption: input.caption,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
    }

    this.updatePageInPlace(categoryId, pageId, (p) => ({ ...p, images: [...p.images, image] }))
    const snapshot = this.snapshots.get(pageId)
    if (snapshot) this.snapshots.set(pageId, { ...snapshot, images: [...snapshot.images, image] })
    this.refreshRecipeCount(categoryId)
    this.notify()

    const form = new FormData()
    form.set('id', image.id)
    form.set('caption', image.caption)
    form.set('file', dataUrlToBlob(input.dataUrl), 'photo')

    fetch(`${API_BASE}/pages/${pageId}/images`, { method: 'POST', body: form })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Upload failed (${res.status})`)
        const resolvedUrl = `${API_BASE}/images/${image.id}`
        this.updatePageInPlace(categoryId, pageId, (p) => ({
          ...p,
          images: p.images.map((img) => (img.id === image.id ? { ...img, url: resolvedUrl } : img)),
        }))
        const snap = this.snapshots.get(pageId)
        if (snap) {
          this.snapshots.set(pageId, {
            ...snap,
            images: snap.images.map((img) =>
              img.id === image.id ? { ...img, url: resolvedUrl } : img,
            ),
          })
        }
        this.notify()
      })
      .catch((err: unknown) => {
        console.error('Image upload failed', err)
        this.updatePageInPlace(categoryId, pageId, (p) => ({
          ...p,
          images: p.images.filter((img) => img.id !== image.id),
        }))
        const snap = this.snapshots.get(pageId)
        if (snap) {
          this.snapshots.set(pageId, {
            ...snap,
            images: snap.images.filter((img) => img.id !== image.id),
          })
        }
        this.refreshRecipeCount(categoryId)
        this.notify()
      })

    return { ok: true, image }
  }

  removeImage(categoryId: string, pageId: string, imageId: string): void {
    const page = this.findPage(pageId)
    const removed = page?.images.find((img) => img.id === imageId)
    const removedIndex = page?.images.findIndex((img) => img.id === imageId) ?? -1
    if (!removed) return

    this.updatePageInPlace(categoryId, pageId, (p) => ({
      ...p,
      images: p.images.filter((img) => img.id !== imageId),
    }))
    const snapshot = this.snapshots.get(pageId)
    if (snapshot) {
      this.snapshots.set(pageId, {
        ...snapshot,
        images: snapshot.images.filter((img) => img.id !== imageId),
      })
    }
    this.refreshRecipeCount(categoryId)
    this.notify()

    apiFetch<void>(`/images/${imageId}`, { method: 'DELETE' }).catch((err: unknown) => {
      console.error('Failed to delete image', err)
      this.updatePageInPlace(categoryId, pageId, (p) => {
        const images = [...p.images]
        images.splice(Math.max(0, removedIndex), 0, removed)
        return { ...p, images }
      })
      const snap = this.snapshots.get(pageId)
      if (snap) {
        const images = [...snap.images]
        images.splice(Math.max(0, removedIndex), 0, removed)
        this.snapshots.set(pageId, { ...snap, images })
      }
      this.refreshRecipeCount(categoryId)
      this.notify()
    })
  }

  /** Caption text is draft-only - it rides the next whole-page Save, there's
   * no dedicated endpoint for it (see class doc on addImage). */
  updateCaption(categoryId: string, pageId: string, imageId: string, caption: string): void {
    this.updatePageInPlace(categoryId, pageId, (p) => ({
      ...p,
      images: p.images.map((img) => (img.id === imageId ? { ...img, caption } : img)),
    }))
    this.recomputeDirty(pageId)
    this.notify()
  }

  // Returns the SAME reference across calls until a real write replaces the
  // map entry (see setBookLayout/loadCategories) - required because this is
  // wired straight into useSyncExternalStore's getSnapshot (useBookLayout).
  // A fresh object here (e.g. via spread) fails React's post-commit
  // Object.is check on every render and spins forceStoreRerender forever.
  getBookLayout(categoryId: string): BookLayout {
    return this.layouts.get(categoryId) ?? DEFAULT_BOOK_LAYOUT
  }

  /** Applied locally at once (smooth dragging); PATCHed to the server after a
   * quiet period so a drag only produces one request, approximating "save on
   * drag end" without needing ResizeHandle to report drag-end itself. */
  setBookLayout(categoryId: string, updates: Partial<BookLayout>): void {
    const next = clampLayout({ ...this.getBookLayout(categoryId), ...updates })
    this.layouts.set(categoryId, next)
    this.notify()

    const existingTimer = this.layoutSaveTimers.get(categoryId)
    if (existingTimer) clearTimeout(existingTimer)
    this.layoutSaveTimers.set(
      categoryId,
      setTimeout(() => {
        this.layoutSaveTimers.delete(categoryId)
        apiFetch<CategoryDto>(`/categories/${categoryId}`, {
          method: 'PATCH',
          body: JSON.stringify({ layout: next }),
        }).catch((err: unknown) => {
          console.error('Failed to save book layout', err)
        })
      }, LAYOUT_SAVE_DEBOUNCE_MS),
    )
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
