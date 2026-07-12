import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CookbookProvider } from './store/CookbookContext'
import { ShelfView } from './components/shelf/ShelfView'
import { BookView } from './components/book/BookView'

function App() {
  return (
    <CookbookProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShelfView />} />
          <Route path="/book/:categoryId" element={<BookView />} />
        </Routes>
      </BrowserRouter>
    </CookbookProvider>
  )
}

export default App
