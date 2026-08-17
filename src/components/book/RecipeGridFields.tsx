import type { TFunction } from 'i18next'

const BRASS = 'rgba(201,162,75,0.55)'
const BRASS_SOLID = '#C9A24B'
const INK = '#2B2622'
const INK_MUTED = 'rgba(43,38,34,0.6)'

export { BRASS, BRASS_SOLID, INK, INK_MUTED }

type AmountNameFieldsProps = {
  amount: string
  name: string
  onChangeAmount: (value: string) => void
  onChangeName: (value: string) => void
  font: string
  t: TFunction
  nameInputRef?: (el: HTMLInputElement | null) => void
  align?: 'start' | 'center'
}

export function AmountNameFields({
  amount,
  name,
  onChangeAmount,
  onChangeName,
  font,
  t,
  nameInputRef,
  align = 'start',
}: AmountNameFieldsProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <input
        value={amount}
        onChange={(e) => onChangeAmount(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder={t('book.grid.amountPlaceholder')}
        className="w-full bg-transparent text-xs outline-none"
        style={{ color: INK_MUTED, fontFamily: font, textAlign: align }}
      />
      <div
        style={{
          borderTop: `1px solid ${BRASS}`,
          opacity: 0.6,
          margin: '2px 0',
        }}
      />
      <input
        ref={nameInputRef}
        value={name}
        onChange={(e) => onChangeName(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder={t('book.grid.ingredientNamePlaceholder')}
        className="w-full bg-transparent text-sm outline-none"
        style={{ color: INK, fontFamily: font, textAlign: align }}
      />
    </div>
  )
}

type StepLabelFieldProps = {
  label: string
  onChange: (value: string) => void
  font: string
  t: TFunction
  inputRef?: (el: HTMLTextAreaElement | null) => void
}

export function StepLabelField({
  label,
  onChange,
  font,
  t,
  inputRef,
}: StepLabelFieldProps) {
  return (
    <textarea
      ref={inputRef}
      value={label}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder={t('book.grid.stepLabelPlaceholder')}
      rows={2}
      className="w-full resize-none bg-transparent text-center text-[11px] leading-tight tracking-widest uppercase outline-none"
      style={{ color: INK, fontFamily: font, fontVariant: 'small-caps' }}
    />
  )
}
