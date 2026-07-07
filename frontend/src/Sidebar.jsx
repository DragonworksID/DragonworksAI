export default function Sidebar({ activePage, onNavigate, historyCount }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">✦</div>
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

      <div className="sidebar-spacer" />

      {/* Footer — version info */}
      <div className="sidebar-footer">
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
