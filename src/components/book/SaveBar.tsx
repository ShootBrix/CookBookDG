import { useTranslation } from 'react-i18next'
import {
  usePageSaveError,
  usePageSaveState,
  useSavePage,
} from '../../store/useCookbook'
import { BRASS, INK_MUTED } from './RecipeGridFields'

type SaveBarProps = {
  categoryId: string
  pageId: string
  font: string
}

/**
 * Normal block element at the end of the page's content, after the notes
 * area - it scrolls with the page like everything else. Present in the DOM
 * only while there's something to report (not idle), so a saved/untouched
 * page renders exactly as it did before this feature existed.
 */
export function SaveBar({ categoryId, pageId, font }: SaveBarProps) {
  const { t } = useTranslation()
  const state = usePageSaveState(pageId)
  const error = usePageSaveError(pageId)
  const savePage = useSavePage()

  if (state === 'idle') return null

  function handleSave() {
    void savePage(categoryId, pageId)
  }

  return (
    <div
      className="mt-4 flex items-center justify-between gap-3 border-t px-8 py-3 -mx-8"
      style={{
        borderColor: BRASS,
        background: 'rgba(246,239,223,0.96)',
      }}
    >
      <span
        className="text-xs italic"
        style={{
          color: state === 'error' ? '#7A2E2A' : INK_MUTED,
          fontFamily: font,
        }}
      >
        {state === 'saving' && t('book.save.saving')}
        {state === 'saved' && t('book.save.saved')}
        {state === 'dirty' && t('book.save.unsaved')}
        {state === 'error' && (error ?? t('book.save.error'))}
      </span>

      {state !== 'saved' && (
        <button
          type="button"
          onClick={handleSave}
          disabled={state === 'saving'}
          className="flex items-center gap-2 rounded px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: '#C9A24B', color: '#2B2114', fontFamily: font }}
        >
          {state === 'saving' && (
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current"
              style={{ borderTopColor: 'transparent' }}
            />
          )}
          {state === 'error' ? t('book.save.retry') : t('book.save.save')}
        </button>
      )}
    </div>
  )
}
