import type { CSSProperties } from 'react'
import type { RecipePage } from '../../types'
import type { RecipePageUpdate } from '../../store/CookbookStore'
import { Page } from './Page'
import { ResizeHandle } from './ResizeHandle'
import type { PageImageActions } from './imageActions'

type SpreadProps = {
  categoryId: string
  direction: 'forward' | 'backward'
  isRtl: boolean
  leftPage: RecipePage | undefined
  rightPage: RecipePage | undefined
  leftPageNumber: number
  rightPageNumber: number
  onChangeLeft: (updates: RecipePageUpdate) => void
  onChangeRight: (updates: RecipePageUpdate) => void
  onAddRightHere?: () => void
  leftImageActions?: PageImageActions
  rightImageActions?: PageImageActions
  /** Fraction of spread width given to the visually-left page. */
  pageRatio: number
  onDividerAdjust: (deltaPx: number) => void
  onDividerReset: () => void
  dividerAriaLabel: string
}

const DIVIDER_WIDTH_PX = 12

/**
 * Isolated so the flip transition (currently a slide+fade keyed remount) can
 * later be swapped for a 3D rotateY page-curl without touching Page/BookView.
 */
export function Spread({
  categoryId,
  direction,
  isRtl,
  leftPage,
  rightPage,
  leftPageNumber,
  rightPageNumber,
  onChangeLeft,
  onChangeRight,
  onAddRightHere,
  leftImageActions,
  rightImageActions,
  pageRatio,
  onDividerAdjust,
  onDividerReset,
  dividerAriaLabel,
}: SpreadProps) {
  // Forward flow follows reading direction: slides in from the trailing
  // edge in LTR, from the leading edge in RTL.
  const flipOffset = (direction === 'forward') === isRtl ? -28 : 28

  // pageRatio always means "share of the visually-left page". leftPage/
  // rightPage are DOM order (reading order), which only matches visual
  // left/right in LTR - in RTL the row is mirrored so DOM-first renders on
  // the right.
  const leftFraction = isRtl ? 1 - pageRatio : pageRatio
  const rightFraction = isRtl ? pageRatio : 1 - pageRatio

  return (
    <div
      className="animate-page-flip relative flex flex-1 flex-col md:flex-row"
      style={
        {
          '--flip-offset': `${flipOffset}px`,
          '--left-basis': `calc((100% - ${DIVIDER_WIDTH_PX}px) * ${leftFraction})`,
          '--right-basis': `calc((100% - ${DIVIDER_WIDTH_PX}px) * ${rightFraction})`,
        } as CSSProperties
      }
    >
      <Page
        categoryId={categoryId}
        page={leftPage}
        pageNumber={leftPageNumber}
        side="left"
        onChange={onChangeLeft}
        imageActions={leftImageActions}
      />

      {/* spine divider: draggable vertical separator on desktop, static horizontal bar on mobile */}
      <div className="relative hidden w-3 shrink-0 md:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 25%, rgba(0,0,0,0.08) 75%, rgba(0,0,0,0.35) 100%)',
          }}
        />
        <ResizeHandle
          orientation="vertical"
          ariaLabel={dividerAriaLabel}
          className="absolute inset-y-0 -inset-x-1"
          onAdjust={onDividerAdjust}
          onReset={onDividerReset}
        />
      </div>
      <div
        className="block h-3 shrink-0 md:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 25%, rgba(0,0,0,0.08) 75%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      <Page
        categoryId={categoryId}
        page={rightPage}
        pageNumber={rightPageNumber}
        side="right"
        onChange={onChangeRight}
        onAddHere={!rightPage ? onAddRightHere : undefined}
        imageActions={rightImageActions}
      />
    </div>
  )
}
