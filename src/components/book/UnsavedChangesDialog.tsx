import { useEffect, useRef } from 'react'
import { useSerifFont } from '../../i18n/useSerifFont'

type UnsavedChangesDialogProps = {
  title: string
  body: string
  saveLabel: string
  discardLabel: string
  cancelLabel: string
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

/** Shown by BookView's router blocker when leaving a page with unsaved
 * edits - same modal shell as ConfirmDialog, with a third (Save) action. */
export function UnsavedChangesDialog({
  title,
  body,
  saveLabel,
  discardLabel,
  cancelLabel,
  saving,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const font = useSerifFont()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable =
          dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)')
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
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        className="w-full max-w-sm rounded-lg p-6 shadow-2xl"
        style={{ background: '#F6EFDF', fontFamily: font }}
      >
        <h2
          id="unsaved-dialog-title"
          className="mb-3 text-xl"
          style={{ color: '#3B2E1F' }}
        >
          {title}
        </h2>
        <p
          className="mb-6 text-sm leading-relaxed"
          style={{ color: 'rgba(59,46,31,0.75)' }}
        >
          {body}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded px-4 py-2 text-sm transition-colors hover:bg-black/5 disabled:opacity-50"
            style={{ color: '#3B2E1F' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#7A2E2A' }}
          >
            {discardLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#C9A24B', color: '#2B2114' }}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
