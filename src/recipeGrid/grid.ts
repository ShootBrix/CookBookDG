import type { Ingredient, RecipeNode, Step } from './types'

/** A childless step has no well-defined size or position - it's corrupt
 * data, not a legitimately empty layout element (treeOps enforces this by
 * collapsing steps once their last child is removed, so the layout module
 * should never actually see one; if it does, something upstream failed to
 * validate/repair the tree before it got here). */
function childlessStepError(node: Step): Error {
  return new Error(
    `Corrupt recipe tree: step "${node.id}" (label ${JSON.stringify(node.label)}) has no children - cannot compute its layout. Run repairForest() before this tree reaches the grid.`,
  )
}

/**
 * Number of ingredient rows a node occupies. Steps must have at least one
 * child for this (and therefore the whole layout) to stay well-formed -
 * treeOps enforces that by collapsing steps once their last child is removed.
 */
export function leafCount(node: RecipeNode): number {
  if (node.kind === 'ingredient') return 1
  if (node.children.length === 0) throw childlessStepError(node)
  return node.children.reduce((sum, child) => sum + leafCount(child), 0)
}

/**
 * Table-column index a node's own cell renders in: 0 = ingredient column.
 * A step's column is always 1+ (one past its deepest child) - `Math.max()`
 * over an empty array is `-Infinity`, not 0, but the failure mode is the
 * same: a childless step has no real column and must never be laid out as
 * though it does (that's what put "MIX" in the ingredient column).
 */
export function column(node: RecipeNode): number {
  if (node.kind === 'ingredient') return 0
  if (node.children.length === 0) throw childlessStepError(node)
  return 1 + Math.max(...node.children.map(column))
}

export function totalColumns(nodes: RecipeNode[]): number {
  if (nodes.length === 0) return 1
  return 1 + Math.max(...nodes.map(column))
}

export function flattenIngredients(nodes: RecipeNode[]): Ingredient[] {
  const result: Ingredient[] = []
  for (const node of nodes) {
    if (node.kind === 'ingredient') result.push(node)
    else result.push(...flattenIngredients(node.children))
  }
  return result
}

type CellBase = { row: number; col: number; rowSpan: number; colSpan: number }
export type IngredientCell = CellBase & {
  kind: 'ingredient'
  id: string
  node: Ingredient
  colSpan: 1
}
export type StepCell = CellBase & {
  kind: 'step'
  id: string
  node: Step
  colSpan: 1
}
export type FillerCell = CellBase & { kind: 'filler'; id: string }
export type GridCell = IngredientCell | StepCell | FillerCell

/**
 * Lays the forest out as a rectangular grid. Returns rows in order; each row
 * holds only the cells that *start* there (rowSpan carries the rest, same as
 * a native HTML table), sorted left to right by column.
 */
export function buildGrid(nodes: RecipeNode[]): GridCell[][] {
  const cols = totalColumns(nodes)
  const totalRows = nodes.reduce((sum, node) => sum + leafCount(node), 0)
  const rows: GridCell[][] = Array.from({ length: totalRows }, () => [])

  function place(node: RecipeNode, rowStart: number, parentColumn: number) {
    const rowSpan = leafCount(node)
    const col = column(node)

    rows[rowStart].push(
      node.kind === 'ingredient'
        ? {
            kind: 'ingredient',
            id: node.id,
            node,
            row: rowStart,
            col,
            rowSpan,
            colSpan: 1,
          }
        : {
            kind: 'step',
            id: node.id,
            node,
            row: rowStart,
            col,
            rowSpan,
            colSpan: 1,
          },
    )

    const gap = parentColumn - col - 1
    if (gap > 0) {
      rows[rowStart].push({
        kind: 'filler',
        id: `filler-${node.id}`,
        row: rowStart,
        col: col + 1,
        rowSpan,
        colSpan: gap,
      })
    }

    if (node.kind === 'step') {
      let cursor = rowStart
      for (const child of node.children) {
        place(child, cursor, col)
        cursor += leafCount(child)
      }
    }
  }

  let cursor = 0
  for (const root of nodes) {
    place(root, cursor, cols)
    cursor += leafCount(root)
  }

  for (const row of rows) row.sort((a, b) => a.col - b.col)

  return rows
}
