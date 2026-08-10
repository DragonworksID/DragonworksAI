import { useState } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import { apiFetch } from '../api.js'
import { CONTENT_TYPES } from '../contentTypes.js'

const TONES = [
  { key: '',                              label: 'Default (santai-profesional)' },
  { key: 'santai dan ngobrol',            label: 'Santai / ngobrol' },
  { key: 'profesional dan rapi',          label: 'Profesional' },
  { key: 'lucu dan playful',              label: 'Lucu / playful' },
  { key: 'hard selling dan penuh urgensi', label: 'Hard selling / urgent' },
  { key: 'inspiratif dan hangat',         label: 'Inspiratif / hangat' },
]

export default function CaptionGenerator() {
  const { scriptHistory, addScript } = useHistory()
  const toast = useToast()

  const [brief, setBrief]             = useState('')
  const [contentType, setContentType] = useState('')
  const [tone, setTone]               = useState('')
  const [count, setCount]             = useState(3)
  const [script, setScript]           = useState('')
  const [captions, setCaptions]       = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const latestScript = scriptHistory.find(item => item.kind !== 'caption')

  function pullLatestScript() {
    if (!latestScript) return
    setScript(latestScript.content)
    if (latestScript.type) setContentType(latestScript.type)
    toast?.showToast('Naskah terakhir dimasukkan sebagai acuan', 'success')
  }

  async function generate() {
    if (!brief.trim()) { setError('Isi dulu brief videonya.'); return }
    setError('')
    setLoading(true)
    setCaptions(null)

    try {
      const res = await apiFetch('/api/caption', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          content_type: contentType || null,
          tone:         tone || null,
          script:       script.trim() || null,
          count:        Number(count),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Gagal membuat caption')

      setCaptions(data.captions)
      addScript({
        id:      data.id,
        kind:    'caption',
        type:    contentType,
        label:   brief.slice(0, 80),
        content: data.captions.join('\n\n———\n\n'),
        model:   data.model,
        ts:      new Date().toLocaleString(),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text)
      .then(() => toast?.showToast('Caption disalin ke clipboard', 'success'))
      .catch(() => toast?.showToast('Gagal menyalin', 'error'))
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Caption Generator</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Buat beberapa opsi caption sekaligus untuk video pendek TikTok &amp; Reels, lengkap dengan
          hashtag. Bisa ditulis dari brief saja, atau langsung mengacu ke naskah yang barusan kamu
          buat di Script Generator.
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-title">Brief Video</div>
            <textarea
              className="form-textarea"
              style={{ width: '100%' }}
              placeholder="Videonya tentang apa? Sebutkan produk, pesan utama, dan target penontonnya.&#10;&#10;Contoh: Review laptop gaming Lenovo LOQ buat mahasiswa desain, highlight harganya lagi promo."
              value={brief}
              onChange={e => setBrief(e.target.value)}
              maxLength={6000}
              rows={5}
            />

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-group">
                <label className="form-label">Jenis konten</label>
                <select className="form-select" value={contentType} onChange={e => setContentType(e.target.value)}>
                  {CONTENT_TYPES.map(t => (
                    <option key={t.key || 'general'} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tone</label>
                <select className="form-select" value={tone} onChange={e => setTone(e.target.value)}>
                  {TONES.map(t => (
                    <option key={t.key || 'default'} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Jumlah opsi</label>
              <select className="form-select" value={count} onChange={e => setCount(e.target.value)}>
                {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} opsi</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Naskah Acuan (Opsional)</div>
            <div className="script-note" style={{ marginBottom: 10 }}>
              Caption yang ditulis dari naskah asli jauh lebih nyambung daripada caption yang
              ditulis dari ringkasan satu baris.
            </div>
            <button
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={pullLatestScript}
              disabled={!latestScript}
            >
              {latestScript
                ? `📄 Pakai naskah terakhir — ${latestScript.label.slice(0, 34)}…`
                : '📄 Belum ada naskah di sesi ini'}
            </button>
            <textarea
              className="form-textarea"
              style={{ width: '100%' }}
              placeholder="Tempel naskah videonya di sini (opsional)…"
              value={script}
              onChange={e => setScript(e.target.value)}
              maxLength={6000}
              rows={5}
            />
          </div>

          <button className="btn-generate" onClick={generate} disabled={loading || !brief.trim()}>
            {loading ? <><div className="spinner" /> Menulis caption…</> : '✨ Buat Caption'}
          </button>
        </div>

        {/* Results */}
        <div className="result-panel">
          <div className="result-header">
            <span className="result-title">
              {loading ? '⏳ Menulis…' : captions ? `✅ ${captions.length} opsi` : '💬 Hasil'}
            </span>
            {captions && captions.length > 0 && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={() => copy(captions.join('\n\n———\n\n'))}>
                  📋 Salin semua
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: 16, minHeight: 320 }}>
            {loading ? (
              <div className="result-placeholder">
                <div className="spinner" style={{ width: 36, height: 36 }} />
                <p>Menulis caption…</p>
              </div>
            ) : captions ? (
              <div className="caption-list">
                {captions.map((text, i) => (
                  <div className="caption-card" key={i}>
                    <div className="caption-card-head">
                      <span className="caption-badge">Opsi {i + 1}</span>
                      <button className="chat-copy-btn" onClick={() => copy(text)}>📋 Salin</button>
                    </div>
                    <div className="caption-card-body">{text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">💬</div>
                <p>Opsi caption akan muncul di sini</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
