import { useState, useRef } from 'react'
import { useHistory } from '../App.jsx'

const EXAMPLES = [
  'World Cup 2026 themed live streaming background with stadium lights and confetti, transparent product display area, festival mood',
  'Payday sale banner background, vibrant gradient colors, modern tech aesthetic, phone product showcase',
  'Elegant dark background with golden accents, luxury product photography style, cinematic lighting',
]

export default function QuickGenerate() {
  const { addToHistory } = useHistory()

  const [prompt, setPrompt]     = useState('')
  const [refImage, setRefImage] = useState(null)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const fileRef                 = useRef()

  async function handleGenerate() {
    if (!prompt.trim()) { setError('Please enter a prompt.'); return }
    setError('')
    setLoading(true)
    setResult(null)

    const fd = new FormData()
    fd.append('prompt', prompt)
    if (refImage?.file) fd.append('reference_image', refImage.file)

    try {
      const res  = await fetch('/api/quick-generate', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')

      const item = { id: data.id, image: data.image, label: data.label, ratio: 'custom', ts: new Date().toLocaleTimeString() }
      setResult(item)
      addToHistory(item)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setRefImage({ file, preview: e.target.result })
    reader.readAsDataURL(file)
  }

  function downloadResult() {
    if (!result) return
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${result.image}`
    a.download = `quick_${result.id}.png`
    a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Quick Generate</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Describe your image in plain language and get a result instantly. Perfect for rapid iterations.
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
            <div className="card-title">Your Prompt</div>

            <textarea
              className="quick-prompt-area"
              placeholder="Describe the image you want to generate in detail…&#10;&#10;e.g. World Cup 2026 themed live streaming background with stadium lights, confetti, and a transparent area for product placement. Festival mood, vibrant colors."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={6}
            />

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                💡 Try an example:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    className="btn-secondary"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.4 }}
                    onClick={() => setPrompt(ex)}
                  >
                    "{ex.slice(0, 80)}…"
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Reference Image (Optional)</div>
            <div
              className="upload-area"
              style={{ minHeight: 120, cursor: refImage ? 'default' : 'pointer' }}
              onClick={() => !refImage && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFileSelect(e.target.files[0])}
              />
              {refImage ? (
                <div className="upload-preview-wrap">
                  <img src={refImage.preview} alt="ref" className="upload-preview" style={{ maxHeight: 120 }} />
                  <button className="upload-clear" onClick={e => { e.stopPropagation(); setRefImage(null) }}>✕</button>
                </div>
              ) : (
                <>
                  <div className="upload-icon" style={{ fontSize: 22 }}>📎</div>
                  <div className="upload-text"><span>Attach a reference</span></div>
                  <div className="upload-hint">Optional style/theme reference</div>
                </>
              )}
            </div>
          </div>

          <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
            {loading ? <><div className="spinner" /> Generating…</> : '⚡ Quick Generate'}
          </button>
        </div>

        {/* Result */}
        <div className="result-panel">
          <div className="result-header">
            <span className="result-title">
              {loading ? '⏳ Generating…' : result ? '✅ Result' : '🎨 Output'}
            </span>
            {result && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={downloadResult}>⬇ Download</button>
              </div>
            )}
          </div>

          <div className="result-image-wrap" style={{ minHeight: 400 }}>
            {loading ? (
              <div className="result-placeholder">
                <div className="spinner" style={{ width: 36, height: 36 }} />
                <p>Generating…<br /><span style={{ fontSize: 11, opacity: 0.6 }}>10–30 seconds</span></p>
              </div>
            ) : result ? (
              <img src={`data:image/png;base64,${result.image}`} alt={result.label} className="result-image" />
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">⚡</div>
                <p>Your result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
