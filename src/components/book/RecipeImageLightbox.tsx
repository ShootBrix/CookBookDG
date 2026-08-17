import { useEffect, useRef } from 'react'
import type { RecipeImage } from '../../types'

type RecipeImageLightboxProps = {
  image: RecipeImage
  alt: string
  closeLabel: string
  onClose: () => void
  /** Element to restore focus to when the lightbox closes. */
  triggerRef: React.RefObject<HTMLElement | null>
}

export function RecipeImageLightbox({
  image,
  alt,
  closeLabel,
  onClose,
  triggerRef,
}: RecipeImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        // Only the close button is focusable in here, so Tab just stays put.
        e.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    const trigger = triggerRef.current
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      trigger?.focus()
    }
  }, [onClose, triggerRef])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        className="relative max-h-full max-w-full"
      >
        <img
          src={image.url}
          alt={alt}
          className="max-h-[85vh] max-w-full rounded shadow-2xl"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-2 end-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg text-white transition-colors hover:bg-black/70"
        >
          ×
        </button>
      </div>
    </div>
  )
}
