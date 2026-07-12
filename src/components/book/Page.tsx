import type { RecipePage } from '../../types'

type PageProps = {
  page: RecipePage | undefined
  pageNumber: number
  side: 'left' | 'right'
  onChangeTitle: (title: string) => void
  onChangeBody: (body: string) => void
  onAddHere?: () => void
}

const RULE_LINE_HEIGHT = 28

export function Page({
  page,
  pageNumber,
  side,
  onChangeTitle,
  onChangeBody,
  onAddHere,
}: PageProps) {
  return (
    <div
      className="relative flex h-full min-h-[520px] flex-1 flex-col px-8 pt-8 pb-10"
      style={{
        background:
          side === 'left'
            ? 'linear-gradient(90deg, #E9DFC8 0%, #F6EFDF 8%, #F6EFDF 100%)'
            : 'linear-gradient(270deg, #E9DFC8 0%, #F6EFDF 8%, #F6EFDF 100%)',
      }}
    >
      {page ? (
        <>
          <input
            value={page.title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Recipe title"
            className="mb-3 border-b-2 bg-transparent pb-2 text-[22px] outline-none"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#3B2E1F',
              borderColor: '#C9A24B',
            }}
          />
          <textarea
            value={page.body}
            onChange={(e) => onChangeBody(e.target.value)}
            placeholder="Write the recipe here..."
            className="min-h-0 flex-1 resize-none bg-transparent outline-none"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#3B2E1F',
              lineHeight: `${RULE_LINE_HEIGHT}px`,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${RULE_LINE_HEIGHT - 1}px, rgba(122,96,58,0.22) ${RULE_LINE_HEIGHT - 1}px, rgba(122,96,58,0.22) ${RULE_LINE_HEIGHT}px)`,
              backgroundAttachment: 'local',
            }}
          />
          <div
            className={`mt-2 text-xs italic ${side === 'left' ? 'text-left' : 'text-right'}`}
            style={{
              color: 'rgba(59,46,31,0.55)',
              fontFamily: 'Georgia, serif',
            }}
          >
            — {pageNumber} —
          </div>
        </>
      ) : onAddHere ? (
        <button
          type="button"
          onClick={onAddHere}
          className="flex flex-1 items-center justify-center italic transition-opacity duration-150 hover:opacity-100"
          style={{ color: 'rgba(59,46,31,0.4)', fontFamily: 'Georgia, serif' }}
        >
          + add a page here
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}
