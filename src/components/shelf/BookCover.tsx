import { Link } from 'react-router-dom'
import type { Category } from '../../types'
import { leatherFor } from '../../leather'

type BookCoverProps = {
  category: Category
}

export function BookCover({ category }: BookCoverProps) {
  const leather = leatherFor(category.leather)
  const pageCount = category.pages.length

  return (
    <Link
      to={`/book/${category.id}`}
      className="group relative block h-[236px] w-[168px] shrink-0 rounded-[3px] transition-transform duration-200 ease-out will-change-transform hover:-translate-y-2"
      style={{
        background: leather.cover,
        boxShadow: '0 10px 14px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.35)',
      }}
    >
      <div
        className="absolute inset-0 rounded-[3px] transition-shadow duration-200 group-hover:shadow-[0_22px_30px_rgba(0,0,0,0.55)]"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
        }}
      />

      {/* spine strip */}
      <div
        className="absolute inset-y-0 left-0 w-4 rounded-l-[3px]"
        style={{
          background: leather.spine,
          boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.4)',
        }}
      />

      {/* leather texture sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[3px] opacity-60"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 30%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* brass-framed title plate */}
      <div className="absolute inset-x-6 top-14 flex flex-col items-center gap-1 px-2 py-4">
        <div
          className="w-full border-2 px-2 py-3 text-center"
          style={{ borderColor: '#C9A24B' }}
        >
          <span
            className="block text-[15px] leading-tight break-words"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#F1E3BF',
            }}
          >
            {category.name}
          </span>
        </div>
      </div>

      {/* recipe count */}
      <div
        className="absolute inset-x-0 bottom-3 text-center text-[11px] tracking-wide uppercase"
        style={{ color: '#C9A24B', fontFamily: 'Georgia, serif' }}
      >
        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
      </div>
    </Link>
  )
}
