import {
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

const NUDGE_STEP = 16
const BRASS_HIGHLIGHT = 'rgba(201,162,74,0.55)'

type ResizeHandleProps = {
  orientation: 'vertical' | 'horizontal'
  ariaLabel: string
  className: string
  /**
   * Called with a screen-space delta in px: positive means the pointer moved
   * right (vertical handles) or down (horizontal handles). Keyboard arrows
   * report the same sign convention via +/- NUDGE_STEP, so callers can share
   * one adjustment function for drag and keyboard.
   */
  onAdjust: (deltaPx: number) => void
  onReset: () => void
}

/**
 * Invisible-until-hover drag handle for spread resizing. Pointer events (not
 * mouse events) so it behaves on touch/trackpad; the handle itself reports
 * raw deltas and leaves sign interpretation (which edge grows which way) to
 * the caller, since that differs per handle.
 */
export function ResizeHandle({
  orientation,
  ariaLabel,
  className,
  onAdjust,
  onReset,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    document.body.style.userSelect = 'none'
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const delta = orientation === 'vertical' ? e.movementX : e.movementY
    if (delta !== 0) onAdjust(delta)
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setDragging(false)
    document.body.style.userSelect = ''
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const growKey = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'
    const shrinkKey = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp'
    if (e.key === growKey) {
      onAdjust(NUDGE_STEP)
      e.preventDefault()
    } else if (e.key === shrinkKey) {
      onAdjust(-NUDGE_STEP)
      e.preventDefault()
    } else if (e.key === 'Home') {
      onReset()
      e.preventDefault()
    }
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={`touch-none transition-colors duration-100 hover:bg-[rgba(201,162,74,0.35)] focus:outline-none focus-visible:bg-[rgba(201,162,74,0.35)] ${orientation === 'vertical' ? 'cursor-col-resize' : 'cursor-row-resize'} ${className}`}
      style={dragging ? { background: BRASS_HIGHLIGHT } : undefined}
    />
  )
}

export { BRASS_HIGHLIGHT }
