import { useTranslation } from 'react-i18next'
import { useSerifFont } from '../i18n/useSerifFont'

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const font = useSerifFont()
  const isHebrew = i18n.language === 'he'

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(isHebrew ? 'en' : 'he')}
      className="rounded border px-3 py-1 text-sm transition-colors hover:bg-[rgba(201,162,74,0.15)]"
      style={{ borderColor: '#C9A24B', color: '#C9A24B', fontFamily: font }}
    >
      {isHebrew ? t('language.toggleToEnglish') : t('language.toggleToHebrew')}
    </button>
  )
}
