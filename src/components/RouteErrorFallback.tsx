import { useRouteError } from 'react-router-dom'
import { ErrorScreen } from './ErrorScreen'

/** Wired as each route's `errorElement` - the normal path for a render error
 * inside that route's page (ShelfView, BookView). See ErrorScreen's doc for
 * why this and AppErrorBoundary share one presentational component. */
export function RouteErrorFallback() {
  const error = useRouteError()
  return <ErrorScreen error={error} />
}
