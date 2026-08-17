import type { TFunction } from 'i18next'
import { flattenIngredients } from '../../recipeGrid/grid'
import type { RecipeNode } from '../../recipeGrid/types'
import {
  AmountNameFields,
  BRASS,
  BRASS_SOLID,
  INK,
  INK_MUTED,
} from './RecipeGridFields'

type RecipeGridMobileProps = {
  nodes: RecipeNode[]
  font: string
  t: TFunction
  onUpdateIngredient: (
    id: string,
    updates: { amount?: string; name?: string },
  ) => void
  onDeleteIngredient: (id: string) => void
  onAddIngredient: () => void
  onRenameStep: (id: string, label: string) => void
  onUngroupStep: (id: string) => void
}

function SectionLabel({ children, font }: { children: string; font: string }) {
  return (
    <span
      className="mb-1 block text-[11px] tracking-wider uppercase"
      style={{ color: INK_MUTED, fontFamily: font }}
    >
      {children}
    </span>
  )
}

function RecipeOutline({
  nodes,
  depth,
  font,
  t,
  onRenameStep,
  onUngroupStep,
}: {
  nodes: RecipeNode[]
  depth: number
  font: string
  t: TFunction
  onRenameStep: (id: string, label: string) => void
  onUngroupStep: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => (
        <li key={node.id} style={{ paddingInlineStart: depth * 16 }}>
          {node.kind === 'ingredient' ? (
            <span
              className="text-sm"
              style={{ color: 'rgba(43,38,34,0.75)', fontFamily: font }}
            >
              {[node.amount, node.name].filter(Boolean).join(' ') ||
                t('book.grid.ingredientNamePlaceholder')}
            </span>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <input
                  value={node.label}
                  onChange={(e) => onRenameStep(node.id, e.target.value)}
                  placeholder={t('book.grid.stepLabelPlaceholder')}
                  className="bg-transparent text-xs tracking-widest uppercase outline-none"
                  style={{
                    color: INK,
                    fontFamily: font,
                    fontVariant: 'small-caps',
                  }}
                />
                <button
                  type="button"
                  onClick={() => onUngroupStep(node.id)}
                  className="rounded border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase transition-colors hover:bg-[rgba(201,162,74,0.15)]"
                  style={{ borderColor: BRASS_SOLID, color: BRASS_SOLID, fontFamily: font }}
                >
                  {t('book.grid.ungroup')}
                </button>
              </div>
              <RecipeOutline
                nodes={node.children}
                depth={depth + 1}
                font={font}
                t={t}
                onRenameStep={onRenameStep}
                onUngroupStep={onUngroupStep}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function RecipeGridMobile({
  nodes,
  font,
  t,
  onUpdateIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onRenameStep,
  onUngroupStep,
}: RecipeGridMobileProps) {
  const leaves = flattenIngredients(nodes)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel font={font}>{t('book.grid.ingredients')}</SectionLabel>
        <ul className="flex flex-col gap-1">
          {leaves.map((leaf) => (
            <li
              key={leaf.id}
              className="flex items-center gap-2 border-b pb-1"
              style={{ borderColor: BRASS }}
            >
              <AmountNameFields
                amount={leaf.amount}
                name={leaf.name}
                onChangeAmount={(v) =>
                  onUpdateIngredient(leaf.id, { amount: v })
                }
                onChangeName={(v) => onUpdateIngredient(leaf.id, { name: v })}
                font={font}
                t={t}
              />
              <button
                type="button"
                onClick={() => onDeleteIngredient(leaf.id)}
                aria-label={t('book.grid.deleteIngredient', {
                  name: leaf.name || leaf.id,
                })}
                className="shrink-0 text-sm"
                style={{ color: INK_MUTED }}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onAddIngredient}
          className="mt-2 text-xs italic"
          style={{ color: 'rgba(59,46,31,0.6)', fontFamily: font }}
        >
          {t('book.grid.addIngredient')}
        </button>
      </div>

      {nodes.length > 0 && (
        <div>
          <SectionLabel font={font}>{t('book.grid.steps')}</SectionLabel>
          <RecipeOutline
            nodes={nodes}
            depth={0}
            font={font}
            t={t}
            onRenameStep={onRenameStep}
            onUngroupStep={onUngroupStep}
          />
        </div>
      )}
    </div>
  )
}
