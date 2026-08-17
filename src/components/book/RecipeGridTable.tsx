import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { TFunction } from 'i18next'
import type {
  FillerCell,
  GridCell,
  IngredientCell,
  StepCell,
} from '../../recipeGrid/grid'
import {
  AmountNameFields,
  StepLabelField,
  BRASS,
  BRASS_SOLID,
  INK_MUTED,
} from './RecipeGridFields'

const SELECTED_TINT = 'rgba(201,162,74,0.14)'

/** Space/Enter on the row wrapper toggles selection; the same keydown
 * bubbles up from focused descendants (typing a literal space in an amount
 * field, say), so only act when the wrapper itself is the event target. */
function handleRowKeyDown(
  e: ReactKeyboardEvent<HTMLDivElement>,
  onToggle: () => void,
) {
  if (e.target !== e.currentTarget) return
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    onToggle()
  }
}

type SharedProps = {
  isRtl: boolean
  font: string
  t: TFunction
  rootIds: Set<string>
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onUpdateIngredient: (
    id: string,
    updates: { amount?: string; name?: string },
  ) => void
  onDeleteIngredient: (id: string) => void
  onMoveIngredient: (id: string, direction: 'up' | 'down') => void
  onRenameStep: (id: string, label: string) => void
  onUngroupStep: (id: string) => void
  registerRef: (
    id: string,
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ) => void
}

type RecipeGridTableProps = SharedProps & {
  grid: GridCell[][]
}

const cellBorder = `1px solid ${BRASS}`

/**
 * Purely visual brass-outlined checkbox - the actual click/keyboard target
 * is the row wrapper around it (see IngredientTd/StepTd), so the whole row
 * is "obviously interactive" rather than just this small glyph. Kept
 * `aria-hidden` to avoid a redundant second checkbox for screen readers;
 * the row wrapper carries the real role="checkbox"/aria-checked.
 */
function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-sm border transition-colors"
      style={{
        borderColor: BRASS_SOLID,
        background: selected ? BRASS_SOLID : 'transparent',
      }}
    >
      {selected && (
        <svg width="10" height="10" viewBox="0 0 16 16">
          <path
            d="M2 8.5L6 12.5L14 3.5"
            stroke="#2B2114"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  )
}

function IngredientTd({
  cell,
  ...shared
}: { cell: IngredientCell } & SharedProps) {
  const { node } = cell
  const {
    t,
    font,
    rootIds,
    selected,
    onToggleSelect,
    onUpdateIngredient,
    onDeleteIngredient,
    onMoveIngredient,
    registerRef,
  } = shared
  const isRoot = rootIds.has(node.id)
  const isSelected = isRoot && selected.has(node.id)
  const toggle = () => onToggleSelect(node.id)

  return (
    <td
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
      style={{
        border: cellBorder,
        borderInlineStart: isSelected
          ? `3px solid ${BRASS_SOLID}`
          : cellBorder,
        padding: '6px 8px',
        verticalAlign: 'middle',
        minWidth: 170,
        background: isSelected ? SELECTED_TINT : undefined,
      }}
    >
      <div
        role={isRoot ? 'checkbox' : undefined}
        aria-checked={isRoot ? isSelected : undefined}
        aria-label={isRoot ? t('book.grid.selectRow') : undefined}
        tabIndex={isRoot ? 0 : undefined}
        onClick={isRoot ? toggle : undefined}
        onKeyDown={isRoot ? (e) => handleRowKeyDown(e, toggle) : undefined}
        className={`flex items-center gap-2 ${isRoot ? 'cursor-pointer outline-none' : ''}`}
      >
        {isRoot && <SelectionIndicator selected={isSelected} />}
        <AmountNameFields
          amount={node.amount}
          name={node.name}
          onChangeAmount={(v) => onUpdateIngredient(node.id, { amount: v })}
          onChangeName={(v) => onUpdateIngredient(node.id, { name: v })}
          font={font}
          t={t}
          nameInputRef={(el) => registerRef(node.id, el)}
        />
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMoveIngredient(node.id, 'up')
            }}
            aria-label={t('book.grid.moveUp')}
            className="text-[10px] leading-none"
            style={{ color: INK_MUTED }}
          >
            &#9650;
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMoveIngredient(node.id, 'down')
            }}
            aria-label={t('book.grid.moveDown')}
            className="text-[10px] leading-none"
            style={{ color: INK_MUTED }}
          >
            &#9660;
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteIngredient(node.id)
          }}
          aria-label={t('book.grid.deleteIngredient', {
            name: node.name || node.id,
          })}
          className="shrink-0 text-sm"
          style={{ color: INK_MUTED }}
        >
          &times;
        </button>
      </div>
    </td>
  )
}

function StepTd({ cell, ...shared }: { cell: StepCell } & SharedProps) {
  const { node } = cell
  const {
    t,
    font,
    rootIds,
    selected,
    onToggleSelect,
    onRenameStep,
    onUngroupStep,
    registerRef,
  } = shared
  const isRoot = rootIds.has(node.id)
  const isSelected = isRoot && selected.has(node.id)
  const toggle = () => onToggleSelect(node.id)

  return (
    <td
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
      style={{
        border: cellBorder,
        borderInlineStart: isSelected
          ? `3px solid ${BRASS_SOLID}`
          : cellBorder,
        padding: '6px 8px',
        textAlign: 'center',
        verticalAlign: 'middle',
        minWidth: 110,
        background: isSelected ? SELECTED_TINT : undefined,
      }}
    >
      <div
        role={isRoot ? 'checkbox' : undefined}
        aria-checked={isRoot ? isSelected : undefined}
        aria-label={isRoot ? t('book.grid.selectRow') : undefined}
        tabIndex={isRoot ? 0 : undefined}
        onClick={isRoot ? toggle : undefined}
        onKeyDown={isRoot ? (e) => handleRowKeyDown(e, toggle) : undefined}
        className={`flex flex-col items-center gap-1 ${isRoot ? 'cursor-pointer outline-none' : ''}`}
      >
        {isRoot && <SelectionIndicator selected={isSelected} />}
        <StepLabelField
          label={node.label}
          onChange={(v) => onRenameStep(node.id, v)}
          font={font}
          t={t}
          inputRef={(el) => registerRef(node.id, el)}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUngroupStep(node.id)
          }}
          className="rounded border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase transition-colors hover:bg-[rgba(201,162,74,0.15)]"
          style={{ borderColor: BRASS_SOLID, color: BRASS_SOLID, fontFamily: font }}
        >
          {t('book.grid.ungroup')}
        </button>
      </div>
    </td>
  )
}

function FillerTd({ cell }: { cell: FillerCell }) {
  return (
    <td
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
      style={{
        borderInlineStart: cellBorder,
        borderInlineEnd: cellBorder,
        borderBlockStart: 'none',
        borderBlockEnd: 'none',
      }}
    />
  )
}

export function RecipeGridTable({ grid, ...shared }: RecipeGridTableProps) {
  return (
    <table
      dir={shared.isRtl ? 'rtl' : 'ltr'}
      style={{ borderCollapse: 'collapse', border: `1.5px solid ${BRASS}` }}
    >
      <tbody>
        {grid.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell) => {
              if (cell.kind === 'filler')
                return <FillerTd key={cell.id} cell={cell} />
              if (cell.kind === 'ingredient')
                return <IngredientTd key={cell.id} cell={cell} {...shared} />
              return <StepTd key={cell.id} cell={cell} {...shared} />
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
