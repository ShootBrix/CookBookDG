import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSerifFont } from '../../i18n/useSerifFont'

type AddCategoryCardProps = {
  onAdd: (name: string) => void
}

export function AddCategoryCard({ onAdd }: AddCategoryCardProps) {
  const { t } = useTranslation()
  const font = useSerifFont()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    const name = value.trim()
    if (name) onAdd(name)
    setValue('')
    setEditing(false)
  }

  function cancel() {
    setValue('')
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        className="flex h-[236px] w-[168px] shrink-0 flex-col items-center justify-center gap-3 rounded-[3px] border-2 border-dashed px-4"
        style={{ borderColor: '#C9A24B', background: 'rgba(201,162,74,0.08)' }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') cancel()
          }}
          onBlur={cancel}
          placeholder={t('shelf.categoryNamePlaceholder')}
          className="w-full border-b bg-transparent px-1 py-1 text-center text-sm outline-none"
          style={{
            color: '#F1E3BF',
            borderColor: '#C9A24B',
            fontFamily: font,
          }}
        />
        <span
          className="text-center text-[11px]"
          style={{ color: 'rgba(241,227,191,0.6)' }}
        >
          {t('shelf.enterToAdd')}
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex h-[236px] w-[168px] shrink-0 items-center justify-center rounded-[3px] border-2 border-dashed transition-colors duration-150 hover:bg-[rgba(201,162,74,0.1)]"
      style={{ borderColor: 'rgba(201,162,74,0.6)' }}
    >
      <span
        className="text-sm tracking-wide uppercase"
        style={{ color: '#C9A24B', fontFamily: font }}
      >
        {t('shelf.newCategory')}
      </span>
    </button>
  )
}
