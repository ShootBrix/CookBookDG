import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCategory, useCookbookActions } from '../../store/useCookbook'
import { leatherFor } from '../../leather'
import { useSerifFont } from '../../i18n/useSerifFont'
import { LanguageToggle } from '../LanguageToggle'
import { Spread } from './Spread'
import { DogEar } from './DogEar'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
}

export function BookView() {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isRtl = i18n.dir() === 'rtl'
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = useCategory(categoryId ?? '')
  const { addPage, updatePage } = useCookbookActions()
  const navigate = useNavigate()

  const [spreadIndex, setSpreadIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const pages = category?.pages ?? []
  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2))

  const goPrev = useCallback(() => {
    setDirection('backward')
    setSpreadIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setDirection('forward')
    setSpreadIndex((i) => Math.min(totalSpreads - 1, i + 1))
  }, [totalSpreads])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext, navigate])

  if (!category || !categoryId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#22302A] text-[#F1E3BF]">
        <p style={{ fontFamily: font }}>{t('book.categoryNotFound')}</p>
        <Link to="/" className="underline">
          {t('book.backToShelf')}
        </Link>
      </div>
    )
  }

  const leather = leatherFor(category.leather)
  const leftPage = pages[spreadIndex * 2]
  const rightPage = pages[spreadIndex * 2 + 1]
  const leftPageNumber = spreadIndex * 2 + 1
  const rightPageNumber = spreadIndex * 2 + 2
  const rangeStart = spreadIndex * 2 + 1
  const rangeEnd = Math.min(spreadIndex * 2 + 2, pages.length)

  // Physically mirrored in RTL so prev/next follow reading direction.
  const prevSide = isRtl ? 'right' : 'left'
  const nextSide = isRtl ? 'left' : 'right'

  function handleAddPage() {
    addPage(categoryId!)
    setDirection('forward')
    setSpreadIndex(Math.ceil((pages.length + 1) / 2) - 1)
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          'radial-gradient(circle at 50% 20%, #33463C 0%, #22302A 100%)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 pt-8 pb-6 text-sm">
        <Link
          to="/"
          className="transition-opacity hover:opacity-80"
          style={{ color: '#F1E3BF', fontFamily: font }}
        >
          {t('book.backToShelf')}
        </Link>
        <h2 className="text-lg" style={{ color: '#F1E3BF', fontFamily: font }}>
          {category.name}
        </h2>
        <div className="flex items-center gap-4">
          <span style={{ color: 'rgba(241,227,191,0.7)' }}>
            {t('book.pagesRange', {
              start: rangeStart,
              end: rangeEnd,
              total: pages.length,
            })}
          </span>
          <button
            type="button"
            onClick={handleAddPage}
            className="rounded border px-3 py-1 transition-colors hover:bg-[rgba(201,162,74,0.15)]"
            style={{ borderColor: '#C9A24B', color: '#C9A24B' }}
          >
            {t('book.addPage')}
          </button>
          <LanguageToggle />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <div
          className="relative overflow-hidden rounded-2xl p-3 md:p-4"
          style={{
            background: leather.cover,
            boxShadow:
              '0 30px 60px rgba(0,0,0,0.55), 0 10px 20px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.3)',
          }}
        >
          <div className="relative flex min-h-[520px] overflow-hidden rounded-lg bg-[#F6EFDF]">
            <Spread
              key={spreadIndex}
              direction={direction}
              isRtl={isRtl}
              leftPage={leftPage}
              rightPage={rightPage}
              leftPageNumber={leftPageNumber}
              rightPageNumber={rightPageNumber}
              onChangeLeft={(updates) =>
                leftPage && updatePage(categoryId, leftPage.id, updates)
              }
              onChangeRight={(updates) =>
                rightPage && updatePage(categoryId, rightPage.id, updates)
              }
              onAddRightHere={handleAddPage}
            />
          </div>

          {spreadIndex > 0 && (
            <DogEar
              physicalSide={prevSide}
              label={t('book.previousPage')}
              onClick={goPrev}
            />
          )}
          {spreadIndex < totalSpreads - 1 && (
            <DogEar
              physicalSide={nextSide}
              label={t('book.nextPage')}
              onClick={goNext}
            />
          )}
        </div>
      </main>
    </div>
  )
}
