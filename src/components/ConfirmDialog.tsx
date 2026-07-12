import { useEffect, useRef } from 'react'
import { useSerifFont } from '../i18n/useSerifFont'

type ConfirmDialogProps = {
  open: boolean
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const font = useSerifFont()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable =
          dialogRef.current.querySelectorAll<HTMLElement>('button')
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
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-lg p-6 shadow-2xl"
        style={{ background: '#F6EFDF', fontFamily: font }}
      >
        <h2
          id="confirm-dialog-title"
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
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm transition-colors hover:bg-black/5"
            style={{ color: '#3B2E1F' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#7A2E2A' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
