import { describe, expect, it } from 'vitest'
import { buildGrid, column, leafCount, totalColumns } from './grid'
import type { Ingredient, RecipeNode, Step } from './types'

function ing(id: string, name = id): Ingredient {
  return { id, kind: 'ingredient', amount: '', name }
}

function step(id: string, children: RecipeNode[], label = id): Step {
  return { id, kind: 'step', label, children }
}

describe('single ingredient', () => {
  const nodes = [ing('i1')]

  it('has one column and one row', () => {
    expect(totalColumns(nodes)).toBe(1)
    expect(leafCount(nodes[0])).toBe(1)
  })

  it('renders a single full-span cell', () => {
    const grid = buildGrid(nodes)
    expect(grid).toHaveLength(1)
    expect(grid[0]).toHaveLength(1)
    expect(grid[0][0]).toMatchObject({
      kind: 'ingredient',
      id: 'i1',
      row: 0,
      col: 0,
      rowSpan: 1,
      colSpan: 1,
    })
  })
})

describe('one step over two ingredients', () => {
  const s = step('s1', [ing('i1'), ing('i2')])
  const nodes = [s]

  it('computes columns and rows', () => {
    expect(column(s)).toBe(1)
    expect(totalColumns(nodes)).toBe(2)
    expect(leafCount(s)).toBe(2)
  })

  it('renders a 2x2 rectangular grid with the step spanning both rows', () => {
    const grid = buildGrid(nodes)
    expect(grid).toHaveLength(2)

    expect(grid[0]).toEqual([
      {
        kind: 'ingredient',
        id: 'i1',
        node: ing('i1'),
        row: 0,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        kind: 'step',
        id: 's1',
        node: s,
        row: 0,
        col: 1,
        rowSpan: 2,
        colSpan: 1,
      },
    ])
    expect(grid[1]).toEqual([
      {
        kind: 'ingredient',
        id: 'i2',
        node: ing('i2'),
        row: 1,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
    ])
  })
})

describe('nested steps at different depths', () => {
  // s1 wraps i1+i2, s2 wraps i3 + s1 -> s2 is the single final column.
  const s1 = step('s1', [ing('i1'), ing('i2')])
  const s2 = step('s2', [ing('i3'), s1])
  const nodes = [s2]

  it('computes column depth from leaves, not from root', () => {
    expect(column(ing('i3'))).toBe(0)
    expect(column(s1)).toBe(1)
    expect(column(s2)).toBe(2)
    expect(totalColumns(nodes)).toBe(3)
    expect(leafCount(s2)).toBe(3)
  })

  it('produces a rectangular grid where s2 spans every row', () => {
    const grid = buildGrid(nodes)
    expect(grid).toHaveLength(3)

    // row 0: i3, filler (gap between i3's column and s2's column), s2
    expect(grid[0].map((c) => c.kind)).toEqual(['ingredient', 'filler', 'step'])
    expect(grid[0][0]).toMatchObject({ id: 'i3', col: 0, rowSpan: 1 })
    expect(grid[0][1]).toMatchObject({
      kind: 'filler',
      col: 1,
      rowSpan: 1,
      colSpan: 1,
    })
    expect(grid[0][2]).toMatchObject({ id: 's2', col: 2, rowSpan: 3 })

    // row 1: i1, s1 (s2 continues via rowSpan, not re-emitted)
    expect(grid[1]).toEqual([
      {
        kind: 'ingredient',
        id: 'i1',
        node: ing('i1'),
        row: 1,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        kind: 'step',
        id: 's1',
        node: s1,
        row: 1,
        col: 1,
        rowSpan: 2,
        colSpan: 1,
      },
    ])

    // row 2: only i2 starts here (s1 and s2 both continue via rowSpan)
    expect(grid[2]).toEqual([
      {
        kind: 'ingredient',
        id: 'i2',
        node: ing('i2'),
        row: 2,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
    ])
  })
})

describe('a node that skips columns', () => {
  // A lone root ingredient that never joins any step still needs filler
  // cells out to the final column so the grid stays rectangular.
  const nodes = [ing('i1'), step('s1', [ing('i2'), ing('i3')])]

  it('fills the gap between the lone ingredient and the final column', () => {
    expect(totalColumns(nodes)).toBe(2)
    const grid = buildGrid(nodes)
    expect(grid).toHaveLength(3)

    // i1 is a root at column 0 with a "virtual parent" at totalColumns (2),
    // so it needs a filler spanning column 1.
    expect(grid[0]).toEqual([
      {
        kind: 'ingredient',
        id: 'i1',
        node: ing('i1'),
        row: 0,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        kind: 'filler',
        id: 'filler-i1',
        row: 0,
        col: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ])

    expect(grid[1]).toEqual([
      {
        kind: 'ingredient',
        id: 'i2',
        node: ing('i2'),
        row: 1,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        kind: 'step',
        id: 's1',
        node: nodes[1] as Step,
        row: 1,
        col: 1,
        rowSpan: 2,
        colSpan: 1,
      },
    ])
    expect(grid[2]).toEqual([
      {
        kind: 'ingredient',
        id: 'i3',
        node: ing('i3'),
        row: 2,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
    ])
  })
})

describe('empty forest', () => {
  it('is a 1-column, 0-row grid', () => {
    expect(totalColumns([])).toBe(1)
    expect(buildGrid([])).toEqual([])
  })
})

describe('a childless step (corrupt data)', () => {
  const corrupt = step('s1', [])

  it('throws rather than computing column 0 for it', () => {
    expect(() => column(corrupt)).toThrow(/no children/)
    expect(() => leafCount(corrupt)).toThrow(/no children/)
  })

  it('throws when building a grid that contains one', () => {
    expect(() => buildGrid([ing('i1'), corrupt])).toThrow(/no children/)
  })
})
