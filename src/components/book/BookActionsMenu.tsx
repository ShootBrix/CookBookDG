import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSerifFont } from '../../i18n/useSerifFont'

export type BookActionItem = {
  id: string
  labelKey: string
  action: () => void
  danger?: boolean
}

type BookActionsMenuProps = {
  items: BookActionItem[]
  ariaLabel: string
}

const VIEWPORT_MARGIN = 8
const PANEL_GAP = 6

/**
 * Three-dots menu button + dropdown, config-driven so adding a third/fourth
 * book action later is just another entry in `items` - no new JSX per item.
 * Panel is portaled to <body> and positioned with real viewport math (not
 * pure CSS) since the flip-on-overflow requirement needs actual geometry.
 */
export function BookActionsMenu({ items, ariaLabel }: BookActionsMenuProps) {
  const { t } = useTranslation()
  const font = useSerifFont()
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const focusOnOpenRef = useRef<'first' | 'last'>('first')

  const close = useCallback((refocusTrigger: boolean) => {
    setOpen(false)
    setPlacement(null)
    if (refocusTrigger) triggerRef.current?.focus()
  }, [])

  function openMenu(focusTarget: 'first' | 'last') {
    focusOnOpenRef.current = focusTarget
    setOpen(true)
  }

  // Two-pass positioning: render invisible first so the panel has real
  // dimensions to measure, then place it (flipping either axis if it would
  // overflow the viewport) and focus the requested item.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return

    const triggerRect = trigger.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const isRtl = document.documentElement.dir === 'rtl'

    // Default: hug the trigger's outer (inline-end) edge - right edge in
    // LTR, left edge in RTL - so the panel grows inward from the end of the
    // header's control row instead of off the edge of the viewport.
    let left = isRtl ? triggerRect.left : triggerRect.right - panelRect.width
    if (left < VIEWPORT_MARGIN) {
      left = triggerRect.left
    } else if (left + panelRect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = triggerRect.right - panelRect.width
    }
    left = Math.min(
      Math.max(left, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - panelRect.width - VIEWPORT_MARGIN),
    )

    let top = triggerRect.bottom + PANEL_GAP
    if (top + panelRect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = triggerRect.top - panelRect.height - PANEL_GAP
    }

    setPlacement({ top, left })

    const index = focusOnOpenRef.current === 'last' ? items.length - 1 : 0
    itemRefs.current[index]?.focus()
  }, [open, items.length])

  // Outside click, losing focus (including Tab out), and Escape all close.
  useEffect(() => {
    if (!open) return

    function isInside(target: EventTarget | null): boolean {
      const node = target as Node | null
      return (
        !!node &&
        (panelRef.current?.contains(node) || triggerRef.current?.contains(node) || false)
      )
    }

    function onPointerDown(e: MouseEvent) {
      if (!isInside(e.target)) close(false)
    }
    function onFocusIn(e: FocusEvent) {
      if (!isInside(e.target)) close(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(true)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, close])

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      openMenu('first')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      openMenu('last')
    }
  }

  function handleItemKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      itemRefs.current[(index + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      itemRefs.current[(index - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      itemRefs.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      itemRefs.current[items.length - 1]?.focus()
    }
  }

  function handleSelect(item: BookActionItem) {
    close(true)
    item.action()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => (open ? close(true) : openMenu('first'))}
        onKeyDown={handleTriggerKeyDown}
        className="flex items-center justify-center rounded border px-2 py-1 text-sm transition-colors hover:bg-[rgba(201,162,74,0.15)]"
        style={{ borderColor: '#C9A24B', color: '#C9A24B' }}
      >
        <svg viewBox="0 0 4 16" width="4" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="2" cy="2" r="1.6" />
          <circle cx="2" cy="8" r="1.6" />
          <circle cx="2" cy="14" r="1.6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            id={menuId}
            ref={panelRef}
            role="menu"
            aria-label={ariaLabel}
            className="fixed z-50 w-52 rounded-md border py-1 shadow-xl"
            style={{
              top: placement?.top ?? -9999,
              left: placement?.left ?? -9999,
              visibility: placement ? 'visible' : 'hidden',
              background: '#F6EFDF',
              borderColor: 'rgba(201,162,74,0.55)',
              fontFamily: font,
            }}
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => handleSelect(item)}
                onKeyDown={(e) => handleItemKeyDown(e, index)}
                className="block w-full px-4 py-2 text-start text-sm transition-colors hover:bg-[rgba(201,162,74,0.15)]"
                style={{ color: item.danger ? '#7A2E2A' : '#3B2E1F' }}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
