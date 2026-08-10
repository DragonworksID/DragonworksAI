import { useState } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import { apiFetch } from '../api.js'
import { CONTENT_TYPES } from '../contentTypes.js'

const ANGLES = [
  { key: '',          label: 'Campur (bervariasi)' },
  { key: 'penasaran', label: '🤔 Rasa penasaran' },
  { key: 'angka',     label: '🔢 Angka konkret' },
  { key: 'manfaat',   label: '🎯 Manfaat langsung' },
  { key: 'kontras',   label: '⚡ Kontras / before-after' },
  { key: 'klaim',     label: '💥 Klaim berani' },
]

export default function ThumbnailCaption() {
  const { scriptHistory, addScript } = useHistory()
  const toast = useToast()

  const [brief, setBrief]             = useState('')
  const [contentType, setContentType] = useState('')
  const [angle, setAngle]             = useState('')
  const [count, setCount]             = useState(5)
  const [script, setScript]           = useState('')
  const [result, setResult]           = useState(null)   // { options, max_chars, max_words }
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const latestScript = scriptHistory.find(item => item.kind === 'script')

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
    setResult(null)

    try {
      const res = await apiFetch('/api/thumbnail-caption', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          content_type: contentType || null,
          angle:        angle || null,
          script:       script.trim() || null,
          count:        Number(count),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Gagal membuat teks thumbnail')

      setResult(data)
      addScript({
        id:      data.id,
        kind:    'thumbnail',
        type:    contentType,
        label:   brief.slice(0, 80),
        content: data.options.join('\n'),
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
      .then(() => toast?.showToast(`Disalin: "${text}"`, 'success'))
      .catch(() => toast?.showToast('Gagal menyalin', 'error'))
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Thumbnail Caption</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Teks besar yang ditempel di atas gambar thumbnail — pendek, tajam, dan masih kebaca waktu
          orang scroll cepat. Hasilnya bisa langsung dipakai di kolom Headline pada Thumbnail Creator.
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
              placeholder="Videonya tentang apa? Sebutkan produk dan pesan utamanya.&#10;&#10;Contoh: Review laptop gaming Lenovo LOQ, fokus ke performa render buat mahasiswa desain."
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
                <label className="form-label">Sudut pendekatan</label>
                <select className="form-select" value={angle} onChange={e => setAngle(e.target.value)}>
                  {ANGLES.map(a => (
                    <option key={a.key || 'mixed'} value={a.key}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Jumlah opsi</label>
              <select className="form-select" value={count} onChange={e => setCount(e.target.value)}>
                {[3, 5, 6, 8].map(n => <option key={n} value={n}>{n} opsi</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Naskah Acuan (Opsional)</div>
            <div className="script-note" style={{ marginBottom: 10 }}>
              Kalau naskahnya sudah ada, teks thumbnail bisa diambil dari kata kunci paling kuat
              di dalamnya.
            </div>
            <button
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={pullLatestScript}
              disabled={!latestScript}
            >
              {latestScript
                ? `📄 Pakai naskah terakhir — ${latestScript.label.slice(0, 32)}…`
                : '📄 Belum ada naskah di sesi ini'}
            </button>
            <textarea
              className="form-textarea"
              style={{ width: '100%' }}
              placeholder="Tempel naskah videonya di sini (opsional)…"
              value={script}
              onChange={e => setScript(e.target.value)}
              maxLength={6000}
              rows={4}
            />
          </div>

          <button className="btn-generate" onClick={generate} disabled={loading || !brief.trim()}>
            {loading ? <><div className="spinner" /> Menulis…</> : '🖼️ Buat Teks Thumbnail'}
          </button>
        </div>

        {/* Results */}
        <div className="result-panel">
          <div className="result-header">
            <span className="result-title">
              {loading ? '⏳ Menulis…' : result ? `✅ ${result.options.length} opsi` : '🖼️ Hasil'}
            </span>
            {result?.options?.length > 0 && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={() => copy(result.options.join('\n'))}>
                  📋 Salin semua
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: 16, minHeight: 320 }}>
            {loading ? (
              <div className="result-placeholder">
                <div className="spinner" style={{ width: 36, height: 36 }} />
                <p>Menulis teks thumbnail…</p>
              </div>
            ) : result ? (
              <>
                <div className="script-note" style={{ marginBottom: 12 }}>
                  Target: maksimal {result.max_words} kata / {result.max_chars} karakter biar tetap
                  kebaca di ukuran kecil. Opsi yang lewat batas ditandai kuning.
                </div>
                <div className="caption-list">
                  {result.options.map((text, i) => (
                    <ThumbOption
                      key={i}
                      text={text}
                      maxChars={result.max_chars}
                      maxWords={result.max_words}
                      onCopy={() => copy(text)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">🖼️</div>
                <p>Opsi teks thumbnail akan muncul di sini</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThumbOption({ text, maxChars, maxWords, onCopy }) {
  const chars = text.length
  const words = text.trim().split(/\s+/).filter(Boolean).length
  // Flagged rather than hidden: an over-length option is sometimes still the
  // best idea, and the editor can shorten it themselves. Silently dropping it
  // would be worse than showing it with the number attached.
  const tooLong = chars > maxChars || words > maxWords

  return (
    <div className={`caption-card thumb-option ${tooLong ? 'thumb-option-long' : ''}`}>
      <div className="thumb-option-text">{text}</div>
      <div className="thumb-option-foot">
        <span className={`thumb-count ${tooLong ? 'thumb-count-warn' : ''}`}>
          {words} kata · {chars} karakter{tooLong ? ' · kepanjangan' : ''}
        </span>
        <button className="chat-copy-btn" onClick={onCopy}>📋 Salin</button>
      </div>
    </div>
  )
}
