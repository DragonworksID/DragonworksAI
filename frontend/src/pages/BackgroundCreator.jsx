import { useState } from 'react'
import { useHistory } from '../App.jsx'
import UploadBox from '../UploadBox.jsx'

const INITIAL = {
  description: '', subject: '', object_field: '', environment: '',
  action: '', style: '', camera_angle: '', lighting: '', mood: '', other_details: '',
}

export default function BackgroundCreator() {
  const { addToHistory } = useHistory()

  const [form, setForm]         = useState(INITIAL)
  const [ratio, setRatio]       = useState('Portrait')
  const [refImage, setRefImage] = useState(null)   // { file, preview }
  const [result, setResult]     = useState(null)   // { image (base64), label, id }
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function handleField(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleGenerate() {
    if (!form.description && !form.subject && !form.environment) {
      setError('Please fill in at least one field (Description, Subject, or Environment).')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    fd.append('ratio', ratio)
    if (refImage?.file) fd.append('reference_image', refImage.file)

    try {
      const res  = await fetch('/api/generate', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')

      const item = {
        id:     data.id,
        image:  data.image,
        label:  data.label,
        prompt: data.prompt_used || '',
        ratio,
        ts:     new Date().toLocaleTimeString(),
      }
      setResult(item)
      addToHistory(item)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadResult() {
    if (!result) return
    const a   = document.createElement('a')
    a.href    = `data:image/png;base64,${result.image}`
    a.download = `bg_${result.id}.png`
    a.click()
  }

  function handleReset() {
    setForm(INITIAL)
    setRefImage(null)
    setResult(null)
    setError('')
    setRatio('Portrait')
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-title">Background Creator</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Fill in the description fields below and optionally upload a reference image.
          Gemini AI will generate a professional live-streaming background for you.
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="two-col">
        {/* LEFT — Reference image + ratio */}
        <div>
          <div className="card">
            <div className="card-title">
              <span className="step-badge">1</span>
              Reference Image (Optional)
            </div>

            <UploadBox
              hint="PNG, JPG, WEBP — used as style reference"
              image={refImage}
              onSelect={setRefImage}
            />
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">2</span>
              Aspect Ratio
            </div>
            <div className="ratio-group">
              {[
                { key: 'Portrait',  label: '9:16', w: 18, h: 28 },
                { key: 'Landscape', label: '16:9', w: 28, h: 18 },
                { key: 'Square',    label: '1:1',  w: 22, h: 22 },
              ].map(r => (
                <button
                  key={r.key}
                  className={`ratio-btn${ratio === r.key ? ' active' : ''}`}
                  onClick={() => setRatio(r.key)}
                >
                  <div className="ratio-icon" style={{ width: r.w, height: r.h }} />
                  <span>{r.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{r.key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result panel */}
          <div className="result-panel">
            <div className="result-header">
              <span className="result-title">
                {loading ? '⏳ Generating…' : result ? '✅ Result' : '🎨 Output'}
              </span>
              {result && (
                <div className="result-actions">
                  <button className="btn-secondary" onClick={downloadResult}>⬇ Download</button>
                  <button className="btn-secondary" onClick={() => setResult(null)}>🗑 Clear</button>
                </div>
              )}
            </div>

            <div className="result-image-wrap">
              {loading ? (
                <div className="result-placeholder">
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                  <p>Generating your image…<br /><span style={{ fontSize: 11, opacity: 0.6 }}>This usually takes 10–30 seconds</span></p>
                </div>
              ) : result ? (
                <img
                  src={`data:image/png;base64,${result.image}`}
                  alt={result.label}
                  className="result-image"
                />
              ) : (
                <div className="result-placeholder">
                  <div className="result-placeholder-icon">🖼️</div>
                  <p>Your generated image will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Description fields */}
        <div>
          <div className="card">
            <div className="card-title">
              <span className="step-badge">3</span>
              Describe Your Image
            </div>

            <div className="form-grid" style={{ marginBottom: 14 }}>
              <div className="form-group full">
                <label className="form-label">Description / Purpose *</label>
                <textarea
                  className="form-textarea"
                  name="description"
                  placeholder="e.g. Live streaming background for PAYDAY sale event..."
                  value={form.description}
                  onChange={handleField}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" name="subject" placeholder="e.g. World Cup trophy"
                  value={form.subject} onChange={handleField} />
              </div>

              <div className="form-group">
                <label className="form-label">Object / Product</label>
                <input className="form-input" name="object_field" placeholder="e.g. Infinix Hot 70"
                  value={form.object_field} onChange={handleField} />
              </div>

              <div className="form-group full">
                <label className="form-label">Environment / Background</label>
                <input className="form-input" name="environment" placeholder="e.g. Transparent background, stadium lights"
                  value={form.environment} onChange={handleField} />
              </div>

              <div className="form-group">
                <label className="form-label">Action</label>
                <input className="form-input" name="action" placeholder="e.g. products displayed on podium"
                  value={form.action} onChange={handleField} />
              </div>

              <div className="form-group">
                <label className="form-label">Style</label>
                <input className="form-input" name="style" placeholder="e.g. festival, cinematic"
                  value={form.style} onChange={handleField} />
              </div>
            </div>

            <div className="divider" style={{ margin: '12px 0' }} />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
              Optional details — leave blank if not needed
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Camera Angle</label>
                <input className="form-input" name="camera_angle" placeholder="e.g. front view"
                  value={form.camera_angle} onChange={handleField} />
              </div>

              <div className="form-group">
                <label className="form-label">Lighting</label>
                <input className="form-input" name="lighting" placeholder="e.g. soft, warm"
                  value={form.lighting} onChange={handleField} />
              </div>

              <div className="form-group">
                <label className="form-label">Mood</label>
                <input className="form-input" name="mood" placeholder="e.g. fun, energetic"
                  value={form.mood} onChange={handleField} />
              </div>

              <div className="form-group full">
                <label className="form-label">Other Details</label>
                <input className="form-input" name="other_details" placeholder="Any other specifications..."
                  value={form.other_details} onChange={handleField} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-generate" onClick={handleGenerate} disabled={loading} style={{ flex: 1 }}>
              {loading ? <><div className="spinner" /> Generating…</> : '✦ Generate Image'}
            </button>
            <button className="btn-secondary" onClick={handleReset} disabled={loading}
              style={{ padding: '14px 18px', fontSize: 13 }}>
              ↺ Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
