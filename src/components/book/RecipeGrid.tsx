import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { RecipePage } from '../../types'
import type { RecipePageUpdate } from '../../store/CookbookStore'
import { useSerifFont } from '../../i18n/useSerifFont'
import { buildGrid } from '../../recipeGrid/grid'
import type { Ingredient, RecipeNode } from '../../recipeGrid/types'
import {
  addIngredient,
  combineRoots,
  moveSibling,
  removeNode,
  renameStep,
  ungroupStep,
  updateIngredient,
} from '../../recipeGrid/treeOps'
import { validateForest } from '../../recipeGrid/validate'
import { RecipeGridSetup } from './RecipeGridSetup'
import { RecipeGridTable } from './RecipeGridTable'
import { RecipeGridMobile } from './RecipeGridMobile'
import { RecipeImages } from './RecipeImages'
import { BRASS, INK } from './RecipeGridFields'
import type { PageImageActions } from './imageActions'

type RecipeGridProps = {
  page: RecipePage
  onChange: (updates: RecipePageUpdate) => void
  imageActions: PageImageActions
}

const RULE_LINE_HEIGHT = 28

function ruledBackground(): CSSProperties {
  return {
    lineHeight: `${RULE_LINE_HEIGHT}px`,
    backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${RULE_LINE_HEIGHT - 1}px, rgba(122,96,58,0.22) ${RULE_LINE_HEIGHT - 1}px, rgba(122,96,58,0.22) ${RULE_LINE_HEIGHT}px)`,
    backgroundAttachment: 'local',
  }
}

/** True if every currently-selected id is a contiguous run of root-level
 * siblings - the only shape combineRoots can act on. Selection itself is
 * never restricted at toggle time (see handleToggleSelect); this instead
 * drives whether Combine is enabled and, when it isn't because of this,
 * what explanation to show. */
function isSelectionContiguous(
  nodes: RecipeNode[],
  selected: Set<string>,
): boolean {
  const indices = nodes
    .map((n, i) => (selected.has(n.id) ? i : -1))
    .filter((i) => i !== -1)
  return indices.every((v, i) => i === 0 || v === indices[i - 1] + 1)
}

export function RecipeGrid({ page, onChange, imageActions }: RecipeGridProps) {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isRtl = i18n.dir() === 'rtl'

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const focusRefs = useRef(
    new Map<string, HTMLInputElement | HTMLTextAreaElement>(),
  )

  const nodes = page.nodes
  const rootIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes])
  const grid = useMemo(() => buildGrid(nodes), [nodes])

  useEffect(() => {
    if (!focusId) return
    focusRefs.current.get(focusId)?.focus()
    setFocusId(null)
  }, [focusId])

  function registerRef(
    id: string,
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ) {
    if (el) focusRefs.current.set(id, el)
    else focusRefs.current.delete(id)
  }

  function setNodes(next: RecipeNode[]) {
    // Dev-only assertion: catch a treeOps bug at the exact mutation that
    // caused it, with a descriptive error naming the offending node, rather
    // than let corrupt data silently reach the grid or get saved.
    if (import.meta.env.DEV) validateForest(next)
    onChange({ nodes: next })
  }

  function handleAddIngredient() {
    const { nodes: next, id } = addIngredient(nodes)
    setNodes(next)
    setFocusId(id)
  }

  function handleUpdateIngredient(
    id: string,
    updates: Partial<Pick<Ingredient, 'amount' | 'name'>>,
  ) {
    setNodes(updateIngredient(nodes, id, updates))
  }

  function handleDeleteIngredient(id: string) {
    setNodes(removeNode(nodes, id))
    setSelected((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleMoveIngredient(id: string, direction: 'up' | 'down') {
    setNodes(moveSibling(nodes, id, direction))
  }

  function handleRenameStep(id: string, label: string) {
    setNodes(renameStep(nodes, id, label))
  }

  function handleUngroupStep(id: string) {
    setNodes(ungroupStep(nodes, id))
    setSelected(new Set())
  }

  function handleToggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleClearSelection() {
    setSelected(new Set())
  }

  function handleCombine() {
    const { nodes: next, newStepId } = combineRoots(nodes, [...selected])
    if (!newStepId) return
    setNodes(next)
    setSelected(new Set())
    setFocusId(newStepId)
  }

  function handleGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && selected.size > 0) {
      // Don't let this also trigger BookView's page-level Escape-to-navigate.
      e.stopPropagation()
      handleClearSelection()
    }
  }

  const isContiguous = isSelectionContiguous(nodes, selected)
  const canCombine = selected.size >= 1 && isContiguous
  const combineDisabledReason =
    selected.size === 0
      ? t('book.grid.combineDisabledHint')
      : !isContiguous
        ? t('book.grid.selectionNonAdjacent')
        : undefined

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={handleGridKeyDown}
    >
      <RecipeGridSetup
        setup={page.setup}
        onChange={(setup) => onChange({ setup })}
        font={font}
        t={t}
      />

      <div className="hidden md:block">
        <div className="mb-2 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleAddIngredient}
            className="text-xs italic"
            style={{ color: 'rgba(59,46,31,0.6)', fontFamily: font }}
          >
            {t('book.grid.addIngredient')}
          </button>
          <button
            type="button"
            onClick={handleCombine}
            disabled={!canCombine}
            title={combineDisabledReason}
            aria-label={canCombine ? undefined : combineDisabledReason}
            className="rounded border px-3 py-1 text-xs font-medium tracking-wide uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={
              canCombine
                ? { background: '#C9A24B', color: '#2B2114', borderColor: '#C9A24B' }
                : {
                    borderColor: 'rgba(59,46,31,0.35)',
                    color: 'rgba(59,46,31,0.55)',
                    background: 'transparent',
                  }
            }
          >
            {selected.size > 0
              ? t('book.grid.combineWithCount', { count: selected.size })
              : t('book.grid.combine')}
          </button>
          {selected.size >= 2 && !isContiguous && (
            <span
              className="text-xs italic"
              style={{ color: '#7A2E2A', fontFamily: font }}
            >
              {t('book.grid.selectionNonAdjacent')}
            </span>
          )}
        </div>

        {nodes.length === 0 ? (
          <div
            className="border py-6 text-center text-sm italic"
            style={{
              borderColor: BRASS,
              color: 'rgba(43,38,34,0.5)',
              fontFamily: font,
            }}
          >
            {t('book.grid.empty')}
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto pb-3">
            <RecipeGridTable
              grid={grid}
              isRtl={isRtl}
              font={font}
              t={t}
              rootIds={rootIds}
              selected={selected}
              onToggleSelect={handleToggleSelect}
              onUpdateIngredient={handleUpdateIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onMoveIngredient={handleMoveIngredient}
              onRenameStep={handleRenameStep}
              onUngroupStep={handleUngroupStep}
              registerRef={registerRef}
            />
          </div>
        )}
      </div>

      <div className="md:hidden">
        <RecipeGridMobile
          nodes={nodes}
          font={font}
          t={t}
          onUpdateIngredient={handleUpdateIngredient}
          onDeleteIngredient={handleDeleteIngredient}
          onAddIngredient={handleAddIngredient}
          onRenameStep={handleRenameStep}
          onUngroupStep={handleUngroupStep}
        />
      </div>

      <RecipeImages page={page} imageActions={imageActions} font={font} />

      <textarea
        value={page.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder={t('book.grid.notesPlaceholder')}
        className="mt-4 min-h-[120px] flex-1 resize-none bg-transparent outline-none"
        style={{ color: INK, fontFamily: font, ...ruledBackground() }}
      />
    </div>
  )
}
