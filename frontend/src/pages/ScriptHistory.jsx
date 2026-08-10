import { useState } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import { contentTypeLabel } from '../contentTypes.js'

// Deliberately separate from the image History page. That page renders
// <img src={`data:image/png;base64,${item.image}`}> unconditionally, so a
// text-only entry pushed into the same array would render as a broken image.
export default function ScriptHistory() {
  const { scriptHistory, clearScripts } = useHistory()
  const toast = useToast()

  function copy(text) {
    navigator.clipboard?.writeText(text)
      .then(() => toast?.showToast('Naskah disalin ke clipboard', 'success'))
      .catch(() => toast?.showToast('Gagal menyalin', 'error'))
  }

  function download(item) {
    const blob = new Blob([item.content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `script_${item.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadAll() {
    const body = scriptHistory
      .map(item => `# ${item.label}\n(${item.ts}${item.model ? ` · ${item.model}` : ''})\n\n${item.content}`)
      .join('\n\n' + '═'.repeat(56) + '\n\n')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `all_scripts_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Script History</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Semua naskah dan caption yang dibuat di sesi ini, terbaru di atas.
          Tersimpan selama tab browser ini terbuka.
        </div>
      </div>

      {scriptHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>Belum ada naskah</h3>
          <p>Naskah yang kamu buat di Script Generator akan muncul di sini.</p>
        </div>
      ) : (
        <>
          <div className="script-history-toolbar">
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {scriptHistory.length} naskah di sesi ini
            </div>
            <div className="result-actions">
              <button className="btn-secondary" onClick={downloadAll}>⬇ Unduh semua</button>
              <button className="btn-secondary" onClick={clearScripts}>🗑 Kosongkan</button>
            </div>
          </div>

          <div className="script-history-list">
            {scriptHistory.map((item, i) => (
              <ScriptCard
                key={`${item.id}-${i}`}
                item={item}
                onCopy={() => copy(item.content)}
                onDownload={() => download(item)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ScriptCard({ item, onCopy, onDownload }) {
  const [expanded, setExpanded] = useState(false)
  const isLong   = item.content.length > 420
  const preview  = isLong && !expanded ? `${item.content.slice(0, 420)}…` : item.content

  return (
    <div className="card script-card">
      <div className="script-card-head">
        <div>
          <div className="script-card-label">
            <span className={`badge ${item.kind === 'script' ? 'badge-new' : 'badge-soon'}`}
                  style={{ marginRight: 8 }}>
              {item.kind === 'caption' ? '💬 CAPTION'
                : item.kind === 'thumbnail' ? '🏷️ THUMBNAIL'
                : '📝 SCRIPT'}
            </span>
            {item.label}
          </div>
          <div className="history-card-meta">
            {item.type ? `${contentTypeLabel(item.type)} · ` : ''}
            {item.ts}{item.model ? ` · ${item.model}` : ''}
          </div>
        </div>
        <div className="result-actions">
          <button className="btn-secondary" onClick={onCopy}>📋 Salin</button>
          <button className="btn-secondary" onClick={onDownload}>⬇ .txt</button>
        </div>
      </div>

      <div className="script-card-body">{preview}</div>

      {isLong && (
        <button
          className="btn-secondary"
          style={{ fontSize: 11, marginTop: 10, width: '100%' }}
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? '▲ Ringkas' : '▼ Tampilkan penuh'}
        </button>
      )}
    </div>
  )
}
