import type { Category, RecipePage } from '../types'

/**
 * Abstraction over cookbook persistence. Components never touch the
 * underlying data structure directly - only through this interface, so the
 * backing implementation can move from in-memory to localStorage to a
 * real API without touching any component code.
 */
export interface CookbookStore {
  getCategories(): Category[]
  getCategory(categoryId: string): Category | undefined
  addCategory(name: string): Category
  addPage(categoryId: string): RecipePage | undefined
  updatePage(
    categoryId: string,
    pageId: string,
    updates: Partial<Pick<RecipePage, 'title' | 'body'>>,
  ): void
  subscribe(listener: () => void): () => void
}

export const LEATHER_COUNT = 6

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`
}

function makeBlankPage(): RecipePage {
  return { id: nextId('page'), title: '', body: '' }
}

const SEED_CATEGORIES: Category[] = [
  {
    id: 'meat',
    name: 'Meat',
    leather: 0,
    pages: [makeBlankPage(), makeBlankPage()],
  },
  {
    id: 'bread',
    name: 'Bread',
    leather: 1,
    pages: [makeBlankPage(), makeBlankPage()],
  },
  {
    id: 'keto',
    name: 'Keto',
    leather: 2,
    pages: [makeBlankPage(), makeBlankPage()],
  },
]

export class InMemoryStore implements CookbookStore {
  private categories: Category[]
  private listeners = new Set<() => void>()

  constructor(seed: Category[] = SEED_CATEGORIES) {
    this.categories = seed
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  getCategories(): Category[] {
    return this.categories
  }

  getCategory(categoryId: string): Category | undefined {
    return this.categories.find((c) => c.id === categoryId)
  }

  addCategory(name: string): Category {
    const category: Category = {
      id: nextId('cat'),
      name,
      leather: this.categories.length % LEATHER_COUNT,
      pages: [makeBlankPage(), makeBlankPage()],
    }
    this.categories = [...this.categories, category]
    this.notify()
    return category
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
    updates: Partial<Pick<RecipePage, 'title' | 'body'>>,
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

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
