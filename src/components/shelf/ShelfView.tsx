import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories, useCookbookActions } from '../../store/useCookbook'
import type { Category } from '../../types'
import { BookCover } from './BookCover'
import { AddCategoryCard } from './AddCategoryCard'
import { ShelfRow } from './ShelfRow'
import { ConfirmDialog } from '../ConfirmDialog'
import { LanguageToggle } from '../LanguageToggle'
import { useSerifFont } from '../../i18n/useSerifFont'

const BOOKS_PER_SHELF = 5

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size))
  }
  return rows
}

export function ShelfView() {
  const { t } = useTranslation()
  const font = useSerifFont()
  const categories = useCategories()
  const { addCategory, deleteCategory } = useCookbookActions()
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    document.title = t('app.name')
  }, [t])

  const rows = chunk(categories, BOOKS_PER_SHELF)
  const lastRow = rows[rows.length - 1]
  const needsNewRow = !lastRow || lastRow.length >= BOOKS_PER_SHELF

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          'radial-gradient(circle at 50% 20%, #33463C 0%, #22302A 100%)',
      }}
    >
      <div className="flex justify-end px-6 pt-6">
        <LanguageToggle />
      </div>

      <header className="pt-6 pb-14 text-center">
        <h1
          className="text-5xl font-bold tracking-wide"
          style={{ fontFamily: font }}
        >
          <span style={{ color: '#F1E3BF' }}>CookBook</span>
          <span style={{ color: '#C9A24B' }}>DG</span>
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: 'rgba(241,227,191,0.7)', fontFamily: font }}
        >
          {t('app.tagline')}
        </p>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-14 px-6 pb-24">
        {rows.map((row, i) => (
          <ShelfRow key={i}>
            {row.map((category) => (
              <BookCover
                key={category.id}
                category={category}
                onDeleteRequest={setDeleteTarget}
              />
            ))}
            {!needsNewRow && i === rows.length - 1 && (
              <AddCategoryCard onAdd={addCategory} />
            )}
          </ShelfRow>
        ))}
        {needsNewRow && (
          <ShelfRow>
            <AddCategoryCard onAdd={addCategory} />
          </ShelfRow>
        )}
      </main>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('delete.title', { name: deleteTarget?.name ?? '' })}
        body={t('delete.body')}
        cancelLabel={t('delete.cancel')}
        confirmLabel={t('delete.confirm')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteCategory(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
