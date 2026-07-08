import { useHistory } from '../App.jsx'

export default function History() {
  const { history, openEditPhoto } = useHistory()

  function download(item) {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${item.image}`
    a.download = `bg_${item.id}.png`
    a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Generation History</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Images generated this session. Click any result to open it in Edit Photo, where you can
          describe a small adjustment or revision and apply it directly to that image.
          History resets when you refresh the page.
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕒</div>
          <h3>No generations yet</h3>
          <p>Generated images will appear here. Go to Background Creator or Quick Generate to start.</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {history.length} image{history.length !== 1 ? 's' : ''} generated this session
          </div>
          <div className="history-grid">
            {history.map(item => (
              <div className="history-card" key={item.id}>
                <div
                  className="history-card-image-wrap"
                  onClick={() => openEditPhoto(item)}
                  title="Click to edit this image"
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={`data:image/png;base64,${item.image}`}
                    alt={item.label}
                  />
                  <div
                    className="history-card-hover-hint"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1 }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0 }}
                  >
                    ✏️ Click to edit photo
                  </div>
                </div>
                <div className="history-card-info">
                  <div className="history-card-label">{item.label}</div>
                  <div className="history-card-meta">
                    {item.ratio} · {item.ts}
                  </div>
                </div>
                <div className="history-card-actions">
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => openEditPhoto(item)}>
                    ✏️ Edit Photo
                  </button>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => download(item)}>
                    ⬇ Download
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const win = window.open()
                      win.document.write(`<img src="data:image/png;base64,${item.image}" style="max-width:100%;max-height:100vh" />`)
                    }}
                  >
                    🔍
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
