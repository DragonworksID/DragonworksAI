import { useState, useEffect, createContext, useContext } from 'react'
import Sidebar from './Sidebar.jsx'
import { ToastProvider } from './Toast.jsx'
import Login from './pages/Login.jsx'
import BackgroundCreator from './pages/BackgroundCreator.jsx'
import QuickGenerate from './pages/QuickGenerate.jsx'
import ThumbnailCreator from './pages/ThumbnailCreator.jsx'
import EditPhoto from './pages/EditPhoto.jsx'
import History from './pages/History.jsx'
import AdminHistory from './pages/AdminHistory.jsx'

// ── History context — shared across all pages ──────────────
export const HistoryContext = createContext(null)

export function useHistory() {
  return useContext(HistoryContext)
}

// ── Auth context — current logged-in user + role, shared across pages ──
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

const PAGES = {
  background:   BackgroundCreator,
  quick:        QuickGenerate,
  thumbnail:    ThumbnailCreator,
  editphoto:    EditPhoto,
  history:      History,
  adminhistory: AdminHistory,
}

export default function App() {
  // ── Auth state ─────────────────────────────────────────────────────
  // authChecked: whether the initial /api/me call has resolved yet — avoids
  // flashing the Login screen for a split second on every page load.
  // authDisabled: server has no APP_USERS configured (e.g. local dev) —
  // skip the login gate entirely, same as before this feature existed.
  const [authChecked, setAuthChecked]   = useState(false)
  const [authDisabled, setAuthDisabled] = useState(false)
  const [currentUser, setCurrentUser]   = useState(null)   // { username, role } | null

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        setAuthDisabled(!!data.auth_disabled)
        setCurrentUser(data.authenticated ? { username: data.username, role: data.role } : null)
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecked(true))
  }, [])

  async function logout() {
    try { await fetch('/api/logout', { method: 'POST' }) } catch { /* ignore */ }
    setCurrentUser(null)
  }

  const [page, setPage]       = useState('thumbnail')
  const [history, setHistory] = useState([])   // { id, image, label, ts, ratio }
  // A history item queued up to be opened in the dedicated Edit Photo
  // section — set by History.jsx, consumed once by EditPhoto on mount,
  // then cleared.
  const [editPhotoRequest, setEditPhotoRequest] = useState(null)

  function addToHistory(item) {
    setHistory(prev => [item, ...prev].slice(0, 50))  // keep last 50
  }

  function openEditPhoto(item) {
    setEditPhotoRequest(item)
    setPage('editphoto')
  }

  function clearEditPhotoRequest() {
    setEditPhotoRequest(null)
  }

  let content

  if (!authChecked) {
    content = <div className="app-shell" />   // brief blank frame while /api/me resolves
  } else if (!authDisabled && !currentUser) {
    content = (
      <AuthContext.Provider value={{ currentUser, logout }}>
        <Login onLoggedIn={user => setCurrentUser(user)} />
      </AuthContext.Provider>
    )
  } else {
    const PageComponent = PAGES[page] || ThumbnailCreator
    content = (
      <AuthContext.Provider value={{ currentUser, logout }}>
        <HistoryContext.Provider value={{ history, addToHistory, editPhotoRequest, openEditPhoto, clearEditPhotoRequest }}>
          <div className="app-shell">
            <Sidebar activePage={page} onNavigate={setPage} historyCount={history.length} />
            <main className="main-content">
              {/* key={page} + .page-transition gives every page a fresh
                  fade/slide-in on navigation, since swapping `page` already
                  remounts a brand-new component instance. */}
              <div className="page-transition" key={page}>
                <PageComponent />
              </div>
            </main>
          </div>
        </HistoryContext.Provider>
      </AuthContext.Provider>
    )
  }

  return <ToastProvider>{content}</ToastProvider>
}
