import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { RecipePage } from '../../types'
import type { RecipePageUpdate } from '../../store/CookbookStore'
import { useSerifFont } from '../../i18n/useSerifFont'

type PageProps = {
  page: RecipePage | undefined
  pageNumber: number
  side: 'left' | 'right'
  onChange: (updates: RecipePageUpdate) => void
  onAddHere?: () => void
}

const RULE_LINE_HEIGHT = 28

function ruledBackground(): CSSProperties {
  return {
    lineHeight: `${RULE_LINE_HEIGHT}px`,
    backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${RULE_LINE_HEIGHT - 1}px, rgba(122,96,58,0.22) ${RULE_LINE_HEIGHT - 1}px, rgba(122,96,58,0.22) ${RULE_LINE_HEIGHT}px)`,
    backgroundAttachment: 'local',
  }
}

type MetaFieldProps = {
  label: string
  value: string
  font: string
  onChange: (value: string) => void
  first?: boolean
}

function MetaField({ label, value, font, onChange, first }: MetaFieldProps) {
  return (
    <div
      className={`ps-3 ${first ? 'border-s-0 ps-0' : 'border-s'}`}
      style={{ borderColor: 'rgba(201,162,74,0.45)' }}
    >
      <span
        className="block text-[11px] tracking-wider uppercase"
        style={{ color: 'rgba(43,38,34,0.55)', fontFamily: font }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none"
        style={{ color: '#3B2E1F', fontFamily: font }}
      />
    </div>
  )
}

export function Page({
  page,
  pageNumber,
  side,
  onChange,
  onAddHere,
}: PageProps) {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isRtl = i18n.dir() === 'rtl'
  const angle = (side === 'left') !== isRtl ? 90 : 270

  return (
    <div
      className="relative flex h-full min-h-[520px] flex-1 flex-col px-8 pt-8 pb-10"
      style={{
        background: `linear-gradient(${angle}deg, #E9DFC8 0%, #F6EFDF 8%, #F6EFDF 100%)`,
      }}
    >
      {page ? (
        <>
          <input
            value={page.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('book.recipeTitlePlaceholder')}
            className="mb-3 border-b-2 bg-transparent pb-2 text-[22px] outline-none"
            style={{
              fontFamily: font,
              color: '#3B2E1F',
              borderColor: '#C9A24B',
            }}
          />

          <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <MetaField
              label={t('book.servings')}
              value={page.servings}
              font={font}
              onChange={(v) => onChange({ servings: v })}
              first
            />
            <MetaField
              label={t('book.prepTime')}
              value={page.prepTime}
              font={font}
              onChange={(v) => onChange({ prepTime: v })}
            />
            <MetaField
              label={t('book.cookTime')}
              value={page.cookTime}
              font={font}
              onChange={(v) => onChange({ cookTime: v })}
            />
            <MetaField
              label={t('book.ovenTemp')}
              value={page.ovenTemp}
              font={font}
              onChange={(v) => onChange({ ovenTemp: v })}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div
              className="flex flex-col"
              style={{ flex: '0 0 25%', minHeight: 0 }}
            >
              <span
                className="mb-1 text-[11px] tracking-wider uppercase"
                style={{ color: 'rgba(43,38,34,0.55)', fontFamily: font }}
              >
                {t('book.ingredients')}
              </span>
              <textarea
                value={page.ingredients}
                onChange={(e) => onChange({ ingredients: e.target.value })}
                placeholder={t('book.ingredientsPlaceholder')}
                className="min-h-0 flex-1 resize-none bg-transparent outline-none"
                style={{
                  color: '#3B2E1F',
                  fontFamily: font,
                  ...ruledBackground(),
                }}
              />
              <div>
                <div
                  style={{ borderBottom: '1px solid rgba(201,162,74,0.65)' }}
                />
                <div
                  style={{
                    marginTop: '2px',
                    borderBottom: '1px solid rgba(201,162,74,0.35)',
                  }}
                />
              </div>
            </div>

            <textarea
              value={page.body}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder={t('book.bodyPlaceholder')}
              className="mt-3 min-h-0 resize-none bg-transparent outline-none"
              style={{
                flex: '1 1 75%',
                color: '#3B2E1F',
                fontFamily: font,
                ...ruledBackground(),
              }}
            />
          </div>

          <div
            className={`mt-2 text-xs italic ${side === 'left' ? 'text-start' : 'text-end'}`}
            style={{ color: 'rgba(59,46,31,0.55)', fontFamily: font }}
          >
            — {pageNumber} —
          </div>
        </>
      ) : onAddHere ? (
        <button
          type="button"
          onClick={onAddHere}
          className="flex flex-1 items-center justify-center italic transition-opacity duration-150 hover:opacity-100"
          style={{ color: 'rgba(59,46,31,0.4)', fontFamily: font }}
        >
          {t('book.addPageHere')}
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}
