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
              <AdminHistoryCard
                key={`${item.username}-${item.ts}-${i}`}
                item={item}
                onDownload={() => download(item)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AdminHistoryCard({ item, onDownload }) {
  const [showPrompt, setShowPrompt] = useState(false)

  return (
    <div className="history-card">
      <div className="history-card-image-wrap">
        <img
          src={`data:image/png;base64,${item.image}`}
          alt={item.label}
        />
      </div>
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
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onDownload}>
          ⬇ Download
        </button>
      </div>
      {item.prompt && (
        <div style={{ padding: '0 12px 10px' }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 11, width: '100%' }}
            onClick={() => setShowPrompt(v => !v)}
          >
            {showPrompt ? '▲ Hide prompt' : '📝 View prompt used'}
          </button>
          {showPrompt && (
            <>
              <textarea
                className="form-textarea"
                readOnly
                value={item.prompt}
                rows={6}
                style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, width: '100%' }}
              />
              <button
                className="btn-secondary"
                style={{ fontSize: 11, marginTop: 6, width: '100%' }}
                onClick={() => navigator.clipboard?.writeText(item.prompt)}
              >
                📋 Copy prompt
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
