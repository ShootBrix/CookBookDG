import { describe, expect, it } from 'vitest'
import { ForestValidationError, repairForest, validateForest } from './validate'
import type { Ingredient, RecipeNode, Step } from './types'

function ing(id: string, name = id): Ingredient {
  return { id, kind: 'ingredient', amount: '', name }
}

function step(id: string, children: RecipeNode[], label = id): Step {
  return { id, kind: 'step', label, children }
}

describe('validateForest', () => {
  it('accepts a well-formed forest', () => {
    const nodes = [step('s1', [ing('i1'), ing('i2')]), ing('i3')]
    expect(() => validateForest(nodes)).not.toThrow()
  })

  it('catches a step with no children', () => {
    const nodes = [step('s1', [])]
    expect(() => validateForest(nodes)).toThrow(ForestValidationError)
    expect(() => validateForest(nodes)).toThrow(/s1/)
  })

  it('catches a cycle (a node reused as its own descendant)', () => {
    const inner: Step = step('s1', [ing('i1')])
    // Force a cycle: s1 appears again inside its own subtree.
    const outer = step('s2', [inner, inner])
    expect(() => validateForest([outer])).toThrow(ForestValidationError)
  })

  it('catches a duplicate id shared between unrelated roots', () => {
    const nodes = [ing('dup'), step('s1', [ing('dup')])]
    expect(() => validateForest(nodes)).toThrow(ForestValidationError)
  })

  it('catches duplicate sibling ids under the same step (duplicate ordinals)', () => {
    const dupChild = ing('i1')
    const nodes = [step('s1', [dupChild, { ...dupChild }])]
    expect(() => validateForest(nodes)).toThrow(ForestValidationError)
  })
})

describe('repairForest', () => {
  it('returns the same reference when nothing is corrupt', () => {
    const nodes = [step('s1', [ing('i1'), ing('i2')]), ing('i3')]
    expect(repairForest(nodes)).toBe(nodes)
  })

  it('drops a childless step but keeps every ingredient', () => {
    const nodes = [step('mix', []), ing('i1'), ing('i2')]
    const repaired = repairForest(nodes)
    expect(repaired).toEqual([ing('i1'), ing('i2')])
    expect(() => validateForest(repaired)).not.toThrow()
  })

  it('cascades: a step that only contained now-dropped steps is dropped too', () => {
    const nodes = [step('outer', [step('inner', [])]), ing('i1')]
    const repaired = repairForest(nodes)
    expect(repaired).toEqual([ing('i1')])
  })

  it('preserves an ingredient nested inside an otherwise-corrupt sibling step', () => {
    // outer has two children: a valid ingredient and a childless (corrupt) step.
    const nodes = [step('outer', [ing('i1'), step('bad', [])])]
    const repaired = repairForest(nodes)
    // outer survives (still has i1 after bad is dropped); i1 is never lost.
    expect(repaired).toEqual([step('outer', [ing('i1')])])
  })
})
