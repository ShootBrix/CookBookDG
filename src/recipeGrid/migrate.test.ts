import { describe, expect, it } from 'vitest'
import { migrateRecipePage, normalizeRecipePage } from './migrate'

describe('migrateRecipePage', () => {
  it('splits ingredient lines into ingredient nodes and keeps body as notes', () => {
    const legacy = {
      id: 'p1',
      title: 'Toast',
      servings: '2',
      prepTime: '1 min',
      cookTime: '2 min',
      ovenTemp: '',
      ingredients: '2 slices bread\nbutter\n\n  jam  ',
      body: 'Toast the bread. Spread butter and jam.',
    }

    const migrated = migrateRecipePage(legacy)

    expect(migrated.id).toBe('p1')
    expect(migrated.title).toBe('Toast')
    expect(migrated.setup).toEqual([])
    expect(migrated.notes).toBe('Toast the bread. Spread butter and jam.')
    expect(migrated.nodes).toHaveLength(3)
    expect(
      migrated.nodes.map((n) => (n.kind === 'ingredient' ? n.name : null)),
    ).toEqual(['2 slices bread', 'butter', 'jam'])
    expect(
      migrated.nodes.every((n) => n.kind === 'ingredient' && n.amount === ''),
    ).toBe(true)
  })

  it('drops blank lines and tolerates empty ingredients', () => {
    const legacy = {
      id: 'p2',
      title: '',
      servings: '',
      prepTime: '',
      cookTime: '',
      ovenTemp: '',
      ingredients: '',
      body: '',
    }
    expect(migrateRecipePage(legacy).nodes).toEqual([])
  })
})

describe('normalizeRecipePage', () => {
  it('passes a modern page through unchanged', () => {
    const page = {
      id: 'p1',
      title: 'x',
      servings: '',
      prepTime: '',
      cookTime: '',
      ovenTemp: '',
      setup: [],
      nodes: [],
      images: [],
      notes: '',
    }
    expect(normalizeRecipePage(page)).toBe(page)
  })

  it('backfills images on a page saved before the images feature existed', () => {
    const page = {
      id: 'p1',
      title: 'x',
      servings: '',
      prepTime: '',
      cookTime: '',
      ovenTemp: '',
      setup: [],
      nodes: [],
      notes: '',
    }
    expect(normalizeRecipePage(page as never).images).toEqual([])
  })

  it('migrates a legacy page', () => {
    const legacy = {
      id: 'p1',
      title: 'x',
      servings: '',
      prepTime: '',
      cookTime: '',
      ovenTemp: '',
      ingredients: 'salt',
      body: 'notes',
    }
    const result = normalizeRecipePage(legacy)
    expect(result.notes).toBe('notes')
    expect(result.nodes).toHaveLength(1)
  })
})
