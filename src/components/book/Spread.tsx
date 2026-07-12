import type { CSSProperties } from 'react'
import type { RecipePage } from '../../types'
import { Page } from './Page'

type SpreadProps = {
  direction: 'forward' | 'backward'
  leftPage: RecipePage | undefined
  rightPage: RecipePage | undefined
  leftPageNumber: number
  rightPageNumber: number
  onChangeLeftTitle: (title: string) => void
  onChangeLeftBody: (body: string) => void
  onChangeRightTitle: (title: string) => void
  onChangeRightBody: (body: string) => void
  onAddRightHere?: () => void
}

/**
 * Isolated so the flip transition (currently a slide+fade keyed remount) can
 * later be swapped for a 3D rotateY page-curl without touching Page/BookView.
 */
export function Spread({
  direction,
  leftPage,
  rightPage,
  leftPageNumber,
  rightPageNumber,
  onChangeLeftTitle,
  onChangeLeftBody,
  onChangeRightTitle,
  onChangeRightBody,
  onAddRightHere,
}: SpreadProps) {
  return (
    <div
      className="animate-page-flip relative flex flex-1 flex-col md:flex-row"
      style={
        {
          '--flip-offset': direction === 'forward' ? '28px' : '-28px',
        } as CSSProperties
      }
    >
      <Page
        page={leftPage}
        pageNumber={leftPageNumber}
        side="left"
        onChangeTitle={onChangeLeftTitle}
        onChangeBody={onChangeLeftBody}
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
        onChangeTitle={onChangeRightTitle}
        onChangeBody={onChangeRightBody}
        onAddHere={!rightPage ? onAddRightHere : undefined}
      />
    </div>
  )
}
