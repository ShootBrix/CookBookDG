import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** Keeps <html dir/lang> in sync with the active i18next language. */
export function useSyncDocumentDirection() {
  const { i18n } = useTranslation()

  useEffect(() => {
    function apply(lng: string) {
      document.documentElement.dir = i18n.dir(lng)
      document.documentElement.lang = lng
    }
    apply(i18n.language)
    i18n.on('languageChanged', apply)
    return () => {
      i18n.off('languageChanged', apply)
    }
  }, [i18n])
}
