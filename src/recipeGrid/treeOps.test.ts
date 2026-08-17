import { describe, expect, it } from 'vitest'
import { leafCount, totalColumns } from './grid'
import {
  addIngredient,
  combineRoots,
  moveSibling,
  removeNode,
  renameStep,
  ungroupStep,
  updateIngredient,
} from './treeOps'
import type { Ingredient, RecipeNode, Step } from './types'

function ing(id: string, name = id): Ingredient {
  return { id, kind: 'ingredient', amount: '', name }
}

function step(id: string, children: RecipeNode[], label = id): Step {
  return { id, kind: 'step', label, children }
}

describe('combineRoots / ungroupStep round-trip', () => {
  const nodes = [ing('i1'), ing('i2'), ing('i3')]

  it('combines two adjacent roots into one step', () => {
    const { nodes: combined, newStepId } = combineRoots(nodes, ['i1', 'i2'])
    expect(newStepId).not.toBeNull()
    expect(combined).toHaveLength(2)
    expect(combined[0]).toMatchObject({ kind: 'step', label: '' })
    expect((combined[0] as Step).children.map((c) => c.id)).toEqual([
      'i1',
      'i2',
    ])
    expect(combined[1]).toEqual(ing('i3'))

    // grid stays rectangular after combining
    expect(totalColumns(combined)).toBe(2)
    expect(combined.reduce((sum, n) => sum + leafCount(n), 0)).toBe(3)
  })

  it('refuses to combine non-adjacent roots', () => {
    const { nodes: result, newStepId } = combineRoots(nodes, ['i1', 'i3'])
    expect(newStepId).toBeNull()
    expect(result).toEqual(nodes)
  })

  it('wraps a single selected node in its own step', () => {
    const { nodes: result, newStepId } = combineRoots(nodes, ['i1'])
    expect(newStepId).not.toBeNull()
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ kind: 'step', label: '' })
    expect((result[0] as Step).children).toEqual([ing('i1')])
    expect(result[1]).toEqual(ing('i2'))
    expect(result[2]).toEqual(ing('i3'))
  })

  it('combining a step with an adjacent ingredient nests the step one level deeper', () => {
    const { nodes: onceCombined, newStepId: innerStepId } = combineRoots(
      nodes,
      ['i1', 'i2'],
    )
    // onceCombined is [Step(i1,i2), i3] - combine the step root with the
    // adjacent ingredient root that follows it.
    const { nodes: twiceCombined, newStepId: outerStepId } = combineRoots(
      onceCombined,
      [innerStepId!, 'i3'],
    )
    expect(outerStepId).not.toBeNull()
    expect(twiceCombined).toHaveLength(1)
    const outer = twiceCombined[0] as Step
    expect(outer.id).toBe(outerStepId)
    expect(outer.children).toHaveLength(2)
    expect(outer.children[0]).toMatchObject({ kind: 'step', id: innerStepId })
    expect((outer.children[0] as Step).children.map((c) => c.id)).toEqual([
      'i1',
      'i2',
    ])
    expect(outer.children[1]).toEqual(ing('i3'))

    // grid stays rectangular after nesting a level deeper
    expect(totalColumns(twiceCombined)).toBe(3)
    expect(
      twiceCombined.reduce((sum, n) => sum + leafCount(n), 0),
    ).toBe(3)
  })

  it('ungroup splices the step children back in place, restoring the original order', () => {
    const { nodes: combined, newStepId } = combineRoots(nodes, ['i1', 'i2'])
    const restored = ungroupStep(combined, newStepId!)
    expect(restored).toEqual(nodes)
  })

  it('ungroup works on a step nested inside another step', () => {
    const inner = step('s1', [ing('i1'), ing('i2')])
    const outer = step('s2', [inner, ing('i3')])
    const restored = ungroupStep([outer], 's1')
    expect(restored).toEqual([step('s2', [ing('i1'), ing('i2'), ing('i3')])])
  })
})

describe('removeNode cascading collapse', () => {
  it('collapses a step when its only remaining child is deleted', () => {
    const nodes = [step('s1', [ing('i1')])]
    expect(removeNode(nodes, 'i1')).toEqual([])
  })

  it('cascades through multiple nested steps', () => {
    const nodes = [step('outer', [step('inner', [ing('i1')]), ing('i2')])]
    const result = removeNode(nodes, 'i1')
    // inner collapses (empty), which empties outer down to just i2 -
    // outer itself survives since it still has one child left.
    expect(result).toEqual([step('outer', [ing('i2')])])
  })

  it('leaves unrelated siblings untouched', () => {
    const nodes = [step('s1', [ing('i1'), ing('i2')]), ing('i3')]
    expect(removeNode(nodes, 'i1')).toEqual([
      step('s1', [ing('i2')]),
      ing('i3'),
    ])
  })
})

describe('moveSibling', () => {
  it('swaps adjacent root ingredients', () => {
    const nodes = [ing('i1'), ing('i2'), ing('i3')]
    expect(moveSibling(nodes, 'i2', 'up')).toEqual([
      ing('i2'),
      ing('i1'),
      ing('i3'),
    ])
    expect(moveSibling(nodes, 'i2', 'down')).toEqual([
      ing('i1'),
      ing('i3'),
      ing('i2'),
    ])
  })

  it('is a no-op at the boundary', () => {
    const nodes = [ing('i1'), ing('i2')]
    expect(moveSibling(nodes, 'i1', 'up')).toEqual(nodes)
    expect(moveSibling(nodes, 'i2', 'down')).toEqual(nodes)
  })

  it('swaps within a nested step, not across it', () => {
    const nodes = [step('s1', [ing('i1'), ing('i2')]), ing('i3')]
    const result = moveSibling(nodes, 'i1', 'down')
    expect(result).toEqual([step('s1', [ing('i2'), ing('i1')]), ing('i3')])
  })
})

describe('updateIngredient / renameStep', () => {
  it('updates a nested ingredient without touching siblings', () => {
    const nodes = [step('s1', [ing('i1'), ing('i2')])]
    const result = updateIngredient(nodes, 'i1', { amount: '2 cups' })
    expect(result).toEqual([
      step('s1', [{ ...ing('i1'), amount: '2 cups' }, ing('i2')]),
    ])
  })

  it('renames a step in place', () => {
    const nodes = [step('s1', [ing('i1'), ing('i2')])]
    expect(renameStep(nodes, 's1', 'Mix dry ingredients')).toEqual([
      step('s1', [ing('i1'), ing('i2')], 'Mix dry ingredients'),
    ])
  })
})

describe('addIngredient', () => {
  it('appends a new blank ingredient root and returns its id', () => {
    const { nodes, id } = addIngredient([ing('i1')])
    expect(nodes).toHaveLength(2)
    expect(nodes[1]).toEqual({ id, kind: 'ingredient', amount: '', name: '' })
  })

  it('lands as a sibling root after a combine, never absorbed into the new step', () => {
    const { nodes: combined, newStepId } = combineRoots(
      [ing('i1'), ing('i2')],
      ['i1', 'i2'],
    )
    const { nodes: withNewIngredient, id } = addIngredient(combined)

    expect(withNewIngredient).toHaveLength(2)
    expect(withNewIngredient[0]).toMatchObject({
      kind: 'step',
      id: newStepId,
    })
    // The new ingredient is a top-level sibling of the step, not a child of it.
    expect((withNewIngredient[0] as Step).children).toHaveLength(2)
    expect(withNewIngredient[1]).toEqual({
      id,
      kind: 'ingredient',
      amount: '',
      name: '',
    })
  })
})
