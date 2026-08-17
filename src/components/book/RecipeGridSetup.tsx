import type { TFunction } from 'i18next'
import { BRASS, INK } from './RecipeGridFields'

type RecipeGridSetupProps = {
  setup: string[]
  onChange: (setup: string[]) => void
  font: string
  t: TFunction
}

export function RecipeGridSetup({
  setup,
  onChange,
  font,
  t,
}: RecipeGridSetupProps) {
  function updateLine(index: number, value: string) {
    const next = [...setup]
    next[index] = value
    onChange(next)
  }

  function deleteLine(index: number) {
    onChange(setup.filter((_, i) => i !== index))
  }

  function addLine() {
    onChange([...setup, ''])
  }

  return (
    <div
      className="mb-4 pb-3"
      style={{ borderBottom: setup.length > 0 ? `1px solid ${BRASS}` : 'none' }}
    >
      {setup.map((line, index) => (
        <div
          key={index}
          className="mb-1 flex items-center justify-center gap-2"
        >
          <input
            value={line}
            onChange={(e) => updateLine(index, e.target.value)}
            placeholder={t('book.grid.setupPlaceholder')}
            className="flex-1 bg-transparent text-center text-[15px] outline-none"
            style={{ color: INK, fontFamily: font }}
          />
          <button
            type="button"
            onClick={() => deleteLine(index)}
            aria-label={t('book.grid.deleteSetupStep')}
            className="shrink-0 text-sm"
            style={{ color: 'rgba(43,38,34,0.4)' }}
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addLine}
        className="mt-1 block text-center text-xs italic"
        style={{ color: 'rgba(59,46,31,0.5)', fontFamily: font, width: '100%' }}
      >
        {t('book.grid.addSetupStep')}
      </button>
    </div>
  )
}
