import { useState, useEffect } from 'react'

export default function AdminHistory() {
  const [entries, setEntries] = useState(null)   // null = loading
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/admin/history')
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Failed to load history')
        return data
      })
      .then(data => setEntries(data.history || []))
      .catch(err => setError(err.message))
  }, [])

  function download(item) {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${item.image}`
    a.download = `admin_${item.username}_${item.ts}.png`.replace(/[^a-zA-Z0-9_.-]/g, '_')
    a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">All Users' History</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Admin-only view of every generation across every account, most recent first, with who
          generated it. Kept in server memory only (last 200) — it resets whenever the server
          restarts or redeploys, same as everyone's personal History tab.
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {entries === null ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>Loading…</h3>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕒</div>
          <h3>No generations yet</h3>
          <p>Once someone on the team generates an image, it'll show up here.</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {entries.length} image{entries.length !== 1 ? 's' : ''} across all accounts
          </div>
          <div className="history-grid">
            {entries.map((item, i) => (
              <div className="history-card" key={`${item.username}-${item.ts}-${i}`}>
                <img
                  src={`data:image/png;base64,${item.image}`}
                  alt={item.label}
                  style={{ width: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div className="history-card-info">
                  <div className="history-card-label">{item.label}</div>
                  <div className="history-card-meta">
                    <span className="badge badge-locked" style={{ marginRight: 6 }}>
                      👤 {item.username}
                    </span>
                    {item.source}{item.provider ? ` · ${item.provider}` : ''}{item.quality ? ` · ${item.quality}` : ''}
                  </div>
                  <div className="history-card-meta">{new Date(item.ts).toLocaleString()}</div>
                </div>
                <div className="history-card-actions">
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => download(item)}>
                    ⬇ Download
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
