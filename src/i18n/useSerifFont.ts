import { useTranslation } from 'react-i18next'

const LATIN_SERIF = "Georgia, 'Times New Roman', serif"
const HEBREW_SERIF = `'David Libre', ${LATIN_SERIF}`

/** Serif font stack for the active language - Hebrew needs a font that covers it. */
export function useSerifFont(): string {
  const { i18n } = useTranslation()
  return i18n.language === 'he' ? HEBREW_SERIF : LATIN_SERIF
}
