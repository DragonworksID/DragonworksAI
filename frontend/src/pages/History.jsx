import { useHistory } from '../App.jsx'

export default function History() {
  const { history } = useHistory()

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
          Images generated this session. History resets when you refresh the page.
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
                <img
                  src={`data:image/png;base64,${item.image}`}
                  alt={item.label}
                  style={{
                    width: '100%',
                    aspectRatio: item.ratio === 'Landscape' ? '16/9' : item.ratio === 'Square' ? '1/1' : '9/16',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div className="history-card-info">
                  <div className="history-card-label">{item.label}</div>
                  <div className="history-card-meta">
                    {item.ratio} · {item.ts}
                  </div>
                </div>
                <div className="history-card-actions">
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
