import { useCategories, useCookbookActions } from '../../store/useCookbook'
import { BookCover } from './BookCover'
import { AddCategoryCard } from './AddCategoryCard'
import { ShelfRow } from './ShelfRow'

const BOOKS_PER_SHELF = 5

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size))
  }
  return rows
}

export function ShelfView() {
  const categories = useCategories()
  const { addCategory } = useCookbookActions()

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
      <header className="pt-16 pb-14 text-center">
        <h1
          className="text-5xl font-bold tracking-wide"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          <span style={{ color: '#F1E3BF' }}>CookBook</span>
          <span style={{ color: '#C9A24B' }}>DG</span>
        </h1>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-14 px-6 pb-24">
        {rows.map((row, i) => (
          <ShelfRow key={i}>
            {row.map((category) => (
              <BookCover key={category.id} category={category} />
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
    </div>
  )
}
