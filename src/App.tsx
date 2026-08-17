import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { CookbookProvider } from './store/CookbookContext'
import { ShelfView } from './components/shelf/ShelfView'
import { BookView } from './components/book/BookView'
import { useSyncDocumentDirection } from './i18n/useSyncDocumentDirection'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { RouteErrorFallback } from './components/RouteErrorFallback'

// A data router (not <BrowserRouter>/<Routes>) so BookView can use
// useBlocker to guard navigation away from an unsaved page.
const router = createBrowserRouter([
  { path: '/', element: <ShelfView />, errorElement: <RouteErrorFallback /> },
  { path: '/book/:slug', element: <BookView />, errorElement: <RouteErrorFallback /> },
])

function App() {
  useSyncDocumentDirection()

  return (
    <CookbookProvider>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </CookbookProvider>
  )
}

export default App
