import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Category } from '../../types'
import { leatherFor } from '../../leather'
import { countRecipes } from '../../recipeUtils'
import { useSerifFont } from '../../i18n/useSerifFont'

type BookCoverProps = {
  category: Category
  onDeleteRequest: (category: Category) => void
}

// Square spine edge, rounded page edge - logical so it mirrors under RTL.
const cardRadius: CSSProperties = {
  borderStartStartRadius: '4px',
  borderStartEndRadius: '10px',
  borderEndEndRadius: '10px',
  borderEndStartRadius: '4px',
}

export function BookCover({ category, onDeleteRequest }: BookCoverProps) {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isRtl = i18n.dir() === 'rtl'
  const leather = leatherFor(category.leather)
  const recipeCount = countRecipes(category.pages)
  const pageEdgeShadowX = isRtl ? 6 : -6

  return (
    <Link
      to={`/book/${category.id}`}
      className="group relative block h-[236px] w-[168px] shrink-0 transition-transform duration-[180ms] ease-out will-change-transform hover:-translate-y-2 hover:rotate-[-1deg]"
      style={{
        background: `linear-gradient(105deg, ${leather.cover}, ${leather.spine})`,
        ...cardRadius,
        boxShadow: '0 10px 18px rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="absolute inset-0 transition-shadow duration-[180ms] group-hover:shadow-[0_22px_30px_rgba(0,0,0,0.55)]"
        style={{
          ...cardRadius,
          boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.25), inset ${pageEdgeShadowX}px 0 12px rgba(0,0,0,0.35)`,
        }}
      />

      {/* spine strip */}
      <div
        className="absolute inset-y-0 start-0 w-[14px]"
        style={{
          borderStartStartRadius: cardRadius.borderStartStartRadius,
          borderEndStartRadius: cardRadius.borderEndStartRadius,
          background: `linear-gradient(90deg, ${leather.spine}, rgba(255,255,255,0.12) 60%, rgba(0,0,0,0.25))`,
        }}
      />

      {/* leather texture sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          ...cardRadius,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 30%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* delete affordance */}
      <button
        type="button"
        aria-label={t('delete.affordanceLabel', { name: category.name })}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDeleteRequest(category)
        }}
        className="absolute top-2 end-2 flex h-6 w-6 items-center justify-center rounded-full text-sm opacity-0 transition-opacity duration-150 hover:bg-black/20 group-hover:opacity-100"
        style={{ color: '#C9A24B' }}
      >
        ×
      </button>

      {/* brass-framed title plate, upper third, offset toward page edge */}
      <div
        className="absolute top-9 start-0 end-0 flex justify-center"
        style={{ paddingInlineStart: '20px' }}
      >
        <div
          className="flex items-center justify-center px-2 text-center"
          style={{
            width: '118px',
            height: '76px',
            border: '1.5px solid #C9A24B',
            boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.15)',
          }}
        >
          <span
            className="block text-[15px] leading-tight break-words"
            style={{ fontFamily: font, color: '#F1E3BF' }}
          >
            {category.name}
          </span>
        </div>
      </div>

      {/* recipe count */}
      <div
        className="absolute inset-x-0 bottom-3 text-center text-[11px] tracking-wide uppercase"
        style={{ color: '#C9A24B', fontFamily: font }}
      >
        {t('shelf.recipesCount', { count: recipeCount })}
      </div>
    </Link>
  )
}
