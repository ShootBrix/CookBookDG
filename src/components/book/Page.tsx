import { useTranslation } from 'react-i18next'
import type { RecipePage } from '../../types'
import type { RecipePageUpdate } from '../../store/CookbookStore'
import { useSerifFont } from '../../i18n/useSerifFont'
import { RecipeGrid } from './RecipeGrid'
import { SaveBar } from './SaveBar'
import type { PageImageActions } from './imageActions'

type PageProps = {
  categoryId: string
  page: RecipePage | undefined
  pageNumber: number
  side: 'left' | 'right'
  onChange: (updates: RecipePageUpdate) => void
  onAddHere?: () => void
  imageActions?: PageImageActions
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
  categoryId,
  page,
  pageNumber,
  side,
  onChange,
  onAddHere,
  imageActions,
}: PageProps) {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isRtl = i18n.dir() === 'rtl'
  const angle = (side === 'left') !== isRtl ? 90 : 270
  const basisClass =
    side === 'left'
      ? 'md:basis-[var(--left-basis)]'
      : 'md:basis-[var(--right-basis)]'

  return (
    <div
      className={`relative flex h-full min-h-[520px] min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-8 pt-8 pb-10 md:grow-0 md:shrink-0 ${basisClass}`}
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

          <RecipeGrid
            page={page}
            onChange={onChange}
            imageActions={imageActions!}
          />

          <div
            className={`mt-2 text-xs italic ${side === 'left' ? 'text-start' : 'text-end'}`}
            style={{ color: 'rgba(59,46,31,0.55)', fontFamily: font }}
          >
            — {pageNumber} —
          </div>

          <SaveBar categoryId={categoryId} pageId={page.id} font={font} />
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
