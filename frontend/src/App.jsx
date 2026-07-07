import { useState, createContext, useContext } from 'react'
import Sidebar from './Sidebar.jsx'
import BackgroundCreator from './pages/BackgroundCreator.jsx'
import QuickGenerate from './pages/QuickGenerate.jsx'
import ThumbnailCreator from './pages/ThumbnailCreator.jsx'
import History from './pages/History.jsx'

// ── History context — shared across all pages ──────────────
export const HistoryContext = createContext(null)

export function useHistory() {
  return useContext(HistoryContext)
}

const PAGES = {
  background: BackgroundCreator,
  quick:      QuickGenerate,
  thumbnail:  ThumbnailCreator,
  history:    History,
}

export default function App() {
  const [page, setPage]       = useState('thumbnail')
  const [history, setHistory] = useState([])   // { id, image, label, ts, ratio }

  function addToHistory(item) {
    setHistory(prev => [item, ...prev].slice(0, 50))  // keep last 50
  }

  const PageComponent = PAGES[page] || ThumbnailCreator

  return (
    <HistoryContext.Provider value={{ history, addToHistory }}>
      <div className="app-shell">
        <Sidebar activePage={page} onNavigate={setPage} historyCount={history.length} />
        <main className="main-content">
          <PageComponent />
        </main>
      </div>
    </HistoryContext.Provider>
  )
}
