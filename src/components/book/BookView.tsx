import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useBookLayout,
  useCategories,
  useCategory,
  useCookbookActions,
  useCookbookStore,
} from '../../store/useCookbook'
import { DEFAULT_BOOK_LAYOUT, isPersistentStore } from '../../store/CookbookStore'
import { leatherFor } from '../../leather'
import { useSerifFont } from '../../i18n/useSerifFont'
import { LanguageToggle } from '../LanguageToggle'
import { ConfirmDialog } from '../ConfirmDialog'
import { Spread } from './Spread'
import { DogEar } from './DogEar'
import { ResizeHandle } from './ResizeHandle'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import { BookActionsMenu, type BookActionItem } from './BookActionsMenu'
import { RenameBookDialog } from './RenameBookDialog'
import type { PageImageActions } from './imageActions'

const OUTER_PADDING_PX = 48 // matches px-6 on both sides of the header/main wrappers

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
}

export function BookView() {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isRtl = i18n.dir() === 'rtl'
  const { slug } = useParams<{ slug: string }>()
  const category = useCategory(slug ?? '')
  const categories = useCategories()
  // The route param may be a slug or (for old bookmarked links) a raw id -
  // useCategory resolves either; everything past this point uses the
  // category's real id, since that's what the store's other id-keyed state
  // (book layout, save state, ...) is actually keyed by.
  const categoryId = category?.id
  const layout = useBookLayout(categoryId ?? '')
  const {
    addPage,
    updatePage,
    getBookLayout,
    setBookLayout,
    addImage,
    removeImage,
    updateCaption,
    renameCategory,
    deleteCategory,
  } = useCookbookActions()
  const navigate = useNavigate()
  const store = useCookbookStore()

  const [spreadIndex, setSpreadIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [blockerBusy, setBlockerBusy] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    document.title = category ? `${category.name} · ${t('app.name')}` : t('app.name')
  }, [category, t])

  const pages = useMemo(() => category?.pages ?? [], [category])
  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2))

  const goPrev = useCallback(() => {
    setDirection('backward')
    setSpreadIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setDirection('forward')
    setSpreadIndex((i) => Math.min(totalSpreads - 1, i + 1))
  }, [totalSpreads])

  const anyDirty = useCallback((): boolean => {
    if (!isPersistentStore(store)) return false
    return pages.some((p) => {
      const state = store.getPageSaveState(p.id)
      return state === 'dirty' || state === 'error'
    })
  }, [store, pages])

  const saveAllDirty = useCallback(async (): Promise<boolean> => {
    if (!isPersistentStore(store) || !categoryId) return true
    const dirtyIds = pages
      .filter((p) => {
        const state = store.getPageSaveState(p.id)
        return state === 'dirty' || state === 'error'
      })
      .map((p) => p.id)
    const results = await Promise.allSettled(
      dirtyIds.map((id) => store.savePage(categoryId, id)),
    )
    return results.every((r) => r.status === 'fulfilled')
  }, [store, pages, categoryId])

  const discardAllDirty = useCallback((): void => {
    if (!isPersistentStore(store) || !categoryId) return
    for (const page of pages) {
      const state = store.getPageSaveState(page.id)
      if (state === 'dirty' || state === 'error') {
        store.discardPageDraft(categoryId, page.id)
      }
    }
  }, [store, pages, categoryId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (anyDirty()) void saveAllDirty()
        return
      }
      if (isTypingTarget(e.target)) return
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext, navigate, anyDirty, saveAllDirty])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!anyDirty()) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [anyDirty])

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        currentLocation.pathname !== nextLocation.pathname && anyDirty(),
      [anyDirty],
    ),
  )

  async function handleBlockerSave() {
    setBlockerBusy(true)
    const ok = await saveAllDirty()
    setBlockerBusy(false)
    if (ok) blocker.proceed?.()
    else blocker.reset?.()
  }

  function handleBlockerDiscard() {
    discardAllDirty()
    blocker.proceed?.()
  }

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

  function handleRenameSave(name: string) {
    renameCategory(categoryId!, name)
    setRenameOpen(false)
  }

  function handleDeleteConfirm() {
    // Bypass the unsaved-changes blocker below - the book (and its drafts)
    // is about to stop existing, so there's nothing left to protect.
    discardAllDirty()
    deleteCategory(categoryId!)
    setDeleteConfirmOpen(false)
    navigate('/')
  }

  const bookActions: BookActionItem[] = [
    { id: 'rename', labelKey: 'book.actions.rename', action: () => setRenameOpen(true) },
    {
      id: 'delete',
      labelKey: 'book.actions.delete',
      action: () => setDeleteConfirmOpen(true),
      danger: true,
    },
  ]

  const otherBookNames = categories
    .filter((c) => c.id !== categoryId)
    .map((c) => c.name)

  function makeImageActions(pageId: string): PageImageActions {
    return {
      addImage: (input) => addImage(categoryId!, pageId, input),
      removeImage: (imageId) => removeImage(categoryId!, pageId, imageId),
      updateCaption: (imageId, caption) =>
        updateCaption(categoryId!, pageId, imageId, caption),
    }
  }

  // Divider delta is always in visual-left-page terms (see Spread); pointer
  // dx maps directly since moving the divider right always grows whatever is
  // visually to its left.
  function adjustDivider(deltaPx: number) {
    const current = getBookLayout(categoryId!)
    setBookLayout(categoryId!, {
      pageRatio: current.pageRatio + deltaPx / current.spreadWidth,
    })
  }
  function resetDivider() {
    setBookLayout(categoryId!, { pageRatio: DEFAULT_BOOK_LAYOUT.pageRatio })
  }
  function adjustWidthFromLeft(deltaPx: number) {
    const current = getBookLayout(categoryId!)
    setBookLayout(categoryId!, { spreadWidth: current.spreadWidth - deltaPx })
  }
  function adjustWidthFromRight(deltaPx: number) {
    const current = getBookLayout(categoryId!)
    setBookLayout(categoryId!, { spreadWidth: current.spreadWidth + deltaPx })
  }
  function resetWidth() {
    setBookLayout(categoryId!, { spreadWidth: DEFAULT_BOOK_LAYOUT.spreadWidth })
  }
  function adjustHeight(deltaPx: number) {
    const current = getBookLayout(categoryId!)
    setBookLayout(categoryId!, { spreadHeight: current.spreadHeight + deltaPx })
  }
  function resetHeight() {
    setBookLayout(categoryId!, {
      spreadHeight: DEFAULT_BOOK_LAYOUT.spreadHeight,
    })
  }

  const outerMaxWidth = layout.spreadWidth + OUTER_PADDING_PX

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          'radial-gradient(circle at 50% 20%, #33463C 0%, #22302A 100%)',
      }}
    >
      <div
        className="mx-auto flex items-center justify-between gap-4 px-6 pt-8 pb-6 text-sm"
        style={{ maxWidth: outerMaxWidth }}
      >
        <Link
          to="/"
          className="transition-opacity hover:opacity-80"
          style={{ color: '#F1E3BF', fontFamily: font }}
        >
          {t('book.backToShelf')}
        </Link>
        <h2
          className="font-display text-[28px] font-semibold md:text-[42px]"
          style={{ color: '#F1E3BF', letterSpacing: '0.02em' }}
        >
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
          <BookActionsMenu
            items={bookActions}
            ariaLabel={t('book.actions.menuLabel', { name: category.name })}
          />
          <LanguageToggle />
        </div>
      </div>

      <main className="mx-auto px-6 pb-16" style={{ maxWidth: outerMaxWidth }}>
        <div
          className="relative w-full overflow-hidden rounded-2xl p-3 md:p-4"
          style={{
            maxWidth: layout.spreadWidth,
            background: leather.cover,
            boxShadow:
              '0 30px 60px rgba(0,0,0,0.55), 0 10px 20px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.3)',
          }}
        >
          <div
            className="relative flex overflow-hidden rounded-lg bg-[#F6EFDF]"
            style={{ height: layout.spreadHeight }}
          >
            <Spread
              key={spreadIndex}
              categoryId={categoryId}
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
              leftImageActions={
                leftPage ? makeImageActions(leftPage.id) : undefined
              }
              rightImageActions={
                rightPage ? makeImageActions(rightPage.id) : undefined
              }
              pageRatio={layout.pageRatio}
              onDividerAdjust={adjustDivider}
              onDividerReset={resetDivider}
              dividerAriaLabel={t('book.resizeDivider')}
            />
          </div>

          <ResizeHandle
            orientation="vertical"
            ariaLabel={t('book.resizeWidth')}
            className="absolute top-0 bottom-10 left-0 w-2"
            onAdjust={adjustWidthFromLeft}
            onReset={resetWidth}
          />
          <ResizeHandle
            orientation="vertical"
            ariaLabel={t('book.resizeWidth')}
            className="absolute top-0 bottom-10 right-0 w-2"
            onAdjust={adjustWidthFromRight}
            onReset={resetWidth}
          />
          <ResizeHandle
            orientation="horizontal"
            ariaLabel={t('book.resizeHeight')}
            className="absolute bottom-0 left-10 right-10 h-2"
            onAdjust={adjustHeight}
            onReset={resetHeight}
          />

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

      {blocker.state === 'blocked' && (
        <UnsavedChangesDialog
          title={t('book.unsavedDialog.title')}
          body={t('book.unsavedDialog.body')}
          saveLabel={t('book.save.save')}
          discardLabel={t('book.unsavedDialog.discard')}
          cancelLabel={t('book.unsavedDialog.cancel')}
          saving={blockerBusy}
          onSave={() => void handleBlockerSave()}
          onDiscard={handleBlockerDiscard}
          onCancel={() => blocker.reset?.()}
        />
      )}

      <RenameBookDialog
        open={renameOpen}
        currentName={category.name}
        existingNames={otherBookNames}
        title={t('book.renameDialog.title')}
        nameLabel={t('book.renameDialog.label')}
        cancelLabel={t('book.renameDialog.cancel')}
        saveLabel={t('book.renameDialog.save')}
        errorEmpty={t('book.renameDialog.errorEmpty')}
        errorTooLong={t('book.renameDialog.errorTooLong')}
        errorDuplicate={(name) => t('book.renameDialog.errorDuplicate', { name })}
        onCancel={() => setRenameOpen(false)}
        onSave={handleRenameSave}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('delete.title', { name: category.name })}
        body={t('delete.body')}
        cancelLabel={t('delete.cancel')}
        confirmLabel={t('delete.confirm')}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
