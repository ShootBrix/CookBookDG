import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSerifFont } from '../../i18n/useSerifFont'

type RenameBookDialogProps = {
  open: boolean
  currentName: string
  /** Other books' names (current book excluded) for the duplicate check. */
  existingNames: string[]
  title: string
  nameLabel: string
  cancelLabel: string
  saveLabel: string
  errorEmpty: string
  errorTooLong: string
  errorDuplicate: (name: string) => string
  onCancel: () => void
  onSave: (name: string) => void
}

const MAX_NAME_LENGTH = 60

/** Same modal shell/styling as ConfirmDialog, with a text field instead of a
 * plain confirm/cancel body. */
export function RenameBookDialog({
  open,
  currentName,
  existingNames,
  title,
  nameLabel,
  cancelLabel,
  saveLabel,
  errorEmpty,
  errorTooLong,
  errorDuplicate,
  onCancel,
  onSave,
}: RenameBookDialogProps) {
  const font = useSerifFont()
  const dialogRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(currentName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValue(currentName)
    setError(null)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open, currentName])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'input, button:not(:disabled)',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onCancel])

  if (!open) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError(errorEmpty)
      return
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(errorTooLong)
      return
    }
    if (existingNames.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase())) {
      setError(errorDuplicate(trimmed))
      return
    }
    onSave(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
        className="w-full max-w-sm rounded-lg p-6 shadow-2xl"
        style={{ background: '#F6EFDF', fontFamily: font }}
      >
        <h2
          id="rename-dialog-title"
          className="mb-3 text-xl"
          style={{ color: '#3B2E1F' }}
        >
          {title}
        </h2>

        <label
          className="mb-1 block text-xs tracking-wider uppercase"
          style={{ color: 'rgba(59,46,31,0.6)' }}
        >
          {nameLabel}
        </label>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          className="mb-1 w-full rounded border bg-transparent px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#C9A24B', color: '#3B2E1F' }}
        />
        <div className="mb-4 min-h-[1.25rem] text-xs" style={{ color: '#7A2E2A' }}>
          {error}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm transition-colors hover:bg-black/5"
            style={{ color: '#3B2E1F' }}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: '#C9A24B', color: '#2B2114' }}
          >
            {saveLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
