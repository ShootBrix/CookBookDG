import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSerifFont } from '../i18n/useSerifFont'
import { useCookbookStore } from '../store/useCookbook'
import { anyUnsavedChanges, saveAllUnsavedChanges } from '../store/CookbookStore'

type ErrorScreenProps = {
  error: unknown
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

/**
 * Crash screen shown in place of a broken page - by AppErrorBoundary (app
 * root, catches anything React Router's own error handling doesn't) and by
 * RouteErrorFallback (wired as each route's errorElement, the normal path
 * for a render error inside ShelfView/BookView). Both mount this inside
 * CookbookProvider, so the store is always reachable here.
 *
 * Deliberately uses full page navigations (not react-router Link) for its
 * actions: when rendered by AppErrorBoundary, RouterProvider itself isn't
 * mounted, so client-side routing isn't available - a hard reload is the one
 * recovery path guaranteed to work from either call site. Reload strips the
 * current query string first - reloading the exact failing URL verbatim
 * (e.g. one with a param that itself triggers the crash) would just
 * re-render this same screen, which is why "Reload" used to appear to do
 * nothing.
 */
export function ErrorScreen({ error }: ErrorScreenProps) {
  const { t } = useTranslation()
  const font = useSerifFont()
  const store = useCookbookStore()
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Never let a failure in the dirty-check itself imply the work is safe.
  function safeAnyUnsavedChanges(): boolean {
    try {
      return anyUnsavedChanges(store)
    } catch {
      return true
    }
  }
  const hasUnsaved = safeAnyUnsavedChanges()

  async function handleRetrySave() {
    setRetrying(true)
    setRetryFailed(false)
    try {
      const ok = await saveAllUnsavedChanges(store)
      setRetryFailed(!ok)
    } catch {
      setRetryFailed(true)
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: '#F6EFDF', color: '#3B2E1F', fontFamily: font }}
    >
      <div className="max-w-md">
        <h1 className="mb-3 text-2xl font-semibold">{t('error.title')}</h1>
        <p
          className="mb-2 text-sm leading-relaxed"
          style={{ color: 'rgba(59,46,31,0.8)' }}
        >
          {t('error.body')}
        </p>
        {hasUnsaved && (
          <p
            className="mb-2 text-sm font-medium leading-relaxed"
            style={{ color: '#7A2E2A' }}
          >
            {t('error.unsavedWarning')}
          </p>
        )}
        {retryFailed && (
          <p className="text-sm" style={{ color: '#7A2E2A' }}>
            {t('error.retryFailed')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {hasUnsaved && (
          <button
            type="button"
            onClick={() => void handleRetrySave()}
            disabled={retrying}
            className="rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#C9A24B', color: '#2B2114' }}
          >
            {retrying ? t('error.retrying') : t('error.retrySave')}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            // A full navigation (not a same-URL reload) so any query param
            // that triggered the crash - crashtest or otherwise - isn't
            // carried into the next load, and so the whole JS runtime
            // (including AppErrorBoundary's caught-error state) starts fresh.
            window.location.assign(window.location.pathname)
          }}
          className="rounded border px-4 py-2 text-sm transition-colors hover:bg-black/5"
          style={{ borderColor: '#3B2E1F' }}
        >
          {t('error.reload')}
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/'
          }}
          className="rounded border px-4 py-2 text-sm transition-colors hover:bg-black/5"
          style={{ borderColor: '#3B2E1F' }}
        >
          {t('error.backToShelf')}
        </button>
      </div>

      {import.meta.env.DEV && (
        <details
          className="mt-2 w-full max-w-lg text-start text-xs"
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
        >
          <summary
            className="cursor-pointer select-none"
            style={{ color: 'rgba(59,46,31,0.7)' }}
          >
            {t('error.detailsToggle')}
          </summary>
          <pre
            className="mt-2 overflow-auto rounded p-3"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#3B2E1F' }}
          >
            {errorDetails(error)}
          </pre>
        </details>
      )}
    </div>
  )
}
