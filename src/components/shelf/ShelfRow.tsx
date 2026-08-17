import type { ReactNode } from 'react'

type ShelfRowProps = {
  children: ReactNode
}

export function ShelfRow({ children }: ShelfRowProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-6 overflow-visible px-2 pt-6 pb-2">
        {children}
      </div>
      <div
        className="h-5 rounded-[2px]"
        style={{
          background: 'linear-gradient(180deg, #8A5A2B 0%, #5A3A1C 100%)',
          boxShadow:
            '0 8px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      />
    </div>
  )
}
