import { useAuth } from './App.jsx'
import Logomark from './Logomark.jsx'

// Deterministic initials + color for the account avatar — same username
// always produces the same look, no state or storage needed.
function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function colorFor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 50%)`
}

export default function Sidebar({ activePage, onNavigate, historyCount }) {
  const auth = useAuth()
  const currentUser = auth?.currentUser
  const isAdmin = currentUser?.role === 'admin'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon"><Logomark /></div>
        <div className="logo-name">Dragonworks <span>Studio</span></div>
        <div className="logo-tagline">Dragonworks AI Dept.</div>
      </div>

      {/* AI Tools */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">AI Tools</div>

        <NavItem
          icon="🖼️"
          label="Thumbnail Creator"
          badge="NEW"
          active={activePage === 'thumbnail'}
          onClick={() => onNavigate('thumbnail')}
        />
        {/* Locked to control AI spend — team doesn't currently use these. */}
        <NavItem icon="🖼️" label="Background Creator" lockedBadge disabled />
        <NavItem icon="⚡" label="Quick Generate" lockedBadge disabled />
        <NavItem icon="📦" label="Batch Mode" badge="SOON" disabled />
      </div>

      {/* Photo Editor */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Photo Editor</div>
        <NavItem
          icon="✏️"
          label="Edit Photo"
          badge="NEW"
          active={activePage === 'editphoto'}
          onClick={() => onNavigate('editphoto')}
        />
        <NavItem icon="🎨" label="Style Transfer" badge="SOON" disabled />
        <NavItem icon="✂️" label="Remove Background" badge="SOON" disabled />
        <NavItem icon="🔄" label="Upscale Image"    badge="SOON" disabled />
      </div>

      {/* History */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Session</div>
        <NavItem
          icon="🕒"
          label={`History${historyCount ? ` (${historyCount})` : ''}`}
          active={activePage === 'history'}
          onClick={() => onNavigate('history')}
        />
      </div>

      {/* Admin — only visible to accounts with role "admin" */}
      {isAdmin && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Admin</div>
          <NavItem
            icon="🛡️"
            label="All Users' History"
            active={activePage === 'adminhistory'}
            onClick={() => onNavigate('adminhistory')}
          />
        </div>
      )}

      <div className="sidebar-spacer" />

      {/* Footer — account + version info */}
      <div className="sidebar-footer">
        {currentUser && (
          <div className="account-card">
            <div className="account-row">
              <span className="account-avatar" style={{ background: colorFor(currentUser.username) }}>
                {initialsFor(currentUser.username)}
              </span>
              <span className="account-name">{currentUser.username}</span>
              {isAdmin && <span className="badge badge-new">ADMIN</span>}
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => auth.logout()}>
              ⎋ Log out
            </button>
          </div>
        )}
        <div className="app-version-card">
          <div className="app-version-label">App Version</div>
          <div className="app-version-row">
            <span className="version-num">v1.0</span>
            <span className="pro-badge">INTERNAL</span>
          </div>
          <div className="version-date">Dragonworks AI Dept.</div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, badge, lockedBadge, active, disabled, onClick }) {
  const cls = ['nav-item', active ? 'active' : '', disabled ? 'disabled' : ''].join(' ')
  return (
    <button className={cls} onClick={disabled ? undefined : onClick} disabled={disabled}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {lockedBadge && <span className="badge badge-locked">🔒 LOCKED</span>}
      {badge && (
        <span className={`badge ${badge === 'NEW' ? 'badge-new' : 'badge-soon'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}
