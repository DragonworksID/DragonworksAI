import { useState, useEffect, createContext, useContext } from 'react'
import Sidebar from './Sidebar.jsx'
import { ToastProvider } from './Toast.jsx'
import Login from './pages/Login.jsx'
import BackgroundCreator from './pages/BackgroundCreator.jsx'
import QuickGenerate from './pages/QuickGenerate.jsx'
import ThumbnailCreator from './pages/ThumbnailCreator.jsx'
import EditPhoto from './pages/EditPhoto.jsx'
import ScriptGenerator from './pages/ScriptGenerator.jsx'
import CaptionGenerator from './pages/CaptionGenerator.jsx'
import ThumbnailCaption from './pages/ThumbnailCaption.jsx'
import ScriptHistory from './pages/ScriptHistory.jsx'
import History from './pages/History.jsx'
import AdminHistory from './pages/AdminHistory.jsx'
import { AUTH_EXPIRED_EVENT } from './api.js'

const SCRIPT_HISTORY_KEY = 'dragonworks:script-history'
const SCRIPT_THREAD_KEY  = 'dragonworks:script-thread'

function loadScriptHistory() {
  try {
    const raw = sessionStorage.getItem(SCRIPT_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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
  background:    BackgroundCreator,
  quick:         QuickGenerate,
  thumbnail:     ThumbnailCreator,
  script:        ScriptGenerator,
  caption:       CaptionGenerator,
  thumbcaption:  ThumbnailCaption,
  editphoto:     EditPhoto,
  history:       History,
  scripthistory: ScriptHistory,
  adminhistory:  AdminHistory,
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

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null)
      setHistory([])
      resetScriptState()
      setEditPhotoRequest(null)
      setPage('thumbnail')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  async function logout() {
    try { await fetch('/api/logout', { method: 'POST' }) } catch { /* ignore */ }
    setCurrentUser(null)
    setHistory([])
    resetScriptState()
    setEditPhotoRequest(null)
    setPage('thumbnail')
  }

  const [page, setPage]       = useState('thumbnail')
  const [history, setHistory] = useState([])   // { id, image, label, ts, ratio }
  // Scripts are kept in their OWN list, not mixed into `history` above:
  // History.jsx renders <img src={`data:image/png;base64,${item.image}`}>
  // unconditionally, so a text-only entry there would render as a broken
  // image. Mirrored to sessionStorage so a refresh (or a backend redeploy)
  // doesn't wipe an editor's work — nothing server-side holds this.
  const [scriptHistory, setScriptHistory] = useState(loadScriptHistory)  // { id, label, content, model, ts }
  // A history item queued up to be opened in the dedicated Edit Photo
  // section — set by History.jsx, consumed once by EditPhoto on mount,
  // then cleared.
  const [editPhotoRequest, setEditPhotoRequest] = useState(null)

  function addToHistory(item) {
    setHistory(prev => [item, ...prev].slice(0, 50))  // keep last 50
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(SCRIPT_HISTORY_KEY, JSON.stringify(scriptHistory))
    } catch { /* storage full or blocked — history just won't survive a refresh */ }
  }, [scriptHistory])

  function addScript(item) {
    setScriptHistory(prev => [item, ...prev].slice(0, 50))
  }

  function clearScripts() {
    setScriptHistory([])
  }

  // Wipe both the saved scripts and the in-progress conversation on logout or
  // session expiry — on a shared editing machine the next person signing in
  // shouldn't inherit someone else's client work.
  function resetScriptState() {
    setScriptHistory([])
    try {
      sessionStorage.removeItem(SCRIPT_HISTORY_KEY)
      sessionStorage.removeItem(SCRIPT_THREAD_KEY)
    } catch { /* ignore */ }
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
        <HistoryContext.Provider value={{
          history, addToHistory,
          scriptHistory, addScript, clearScripts,
          editPhotoRequest, openEditPhoto, clearEditPhotoRequest,
        }}>
          <div className="app-shell">
            <Sidebar
              activePage={page}
              onNavigate={setPage}
              historyCount={history.length}
              scriptCount={scriptHistory.length}
            />
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
