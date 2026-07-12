import type { CSSProperties } from 'react'
import type { RecipePage } from '../../types'
import type { RecipePageUpdate } from '../../store/CookbookStore'
import { Page } from './Page'

type SpreadProps = {
  direction: 'forward' | 'backward'
  isRtl: boolean
  leftPage: RecipePage | undefined
  rightPage: RecipePage | undefined
  leftPageNumber: number
  rightPageNumber: number
  onChangeLeft: (updates: RecipePageUpdate) => void
  onChangeRight: (updates: RecipePageUpdate) => void
  onAddRightHere?: () => void
}

/**
 * Isolated so the flip transition (currently a slide+fade keyed remount) can
 * later be swapped for a 3D rotateY page-curl without touching Page/BookView.
 */
export function Spread({
  direction,
  isRtl,
  leftPage,
  rightPage,
  leftPageNumber,
  rightPageNumber,
  onChangeLeft,
  onChangeRight,
  onAddRightHere,
}: SpreadProps) {
  // Forward flow follows reading direction: slides in from the trailing
  // edge in LTR, from the leading edge in RTL.
  const flipOffset = (direction === 'forward') === isRtl ? -28 : 28

  return (
    <div
      className="animate-page-flip relative flex flex-1 flex-col md:flex-row"
      style={{ '--flip-offset': `${flipOffset}px` } as CSSProperties}
    >
      <Page
        page={leftPage}
        pageNumber={leftPageNumber}
        side="left"
        onChange={onChangeLeft}
      />

      {/* spine divider: vertical on desktop, horizontal on mobile */}
      <div
        className="hidden w-3 shrink-0 md:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 25%, rgba(0,0,0,0.08) 75%, rgba(0,0,0,0.35) 100%)',
        }}
      />
      <div
        className="block h-3 shrink-0 md:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 25%, rgba(0,0,0,0.08) 75%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      <Page
        page={rightPage}
        pageNumber={rightPageNumber}
        side="right"
        onChange={onChangeRight}
        onAddHere={!rightPage ? onAddRightHere : undefined}
      />
    </div>
  )
}
