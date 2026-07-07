import { useState, useRef, useEffect } from 'react'
import { useHistory } from '../App.jsx'

// Converts a base64 PNG (as stored in History) into a File object so it can
// be re-uploaded through the same form-data flow as a fresh upload.
function base64ToFile(b64, filename) {
  const byteChars = atob(b64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/png' })
  return new File([blob], filename, { type: 'image/png' })
}

export default function EditPhoto() {
  const { addToHistory, editPhotoRequest, clearEditPhotoRequest } = useHistory()

  const [photo, setPhoto]   = useState(null)   // { file, preview }
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  // Pre-fill from a History item when opened via "Edit Photo" there. Runs
  // once on mount — History.jsx sets editPhotoRequest then navigates here.
  useEffect(() => {
    if (!editPhotoRequest) return
    const file = base64ToFile(editPhotoRequest.image, `edit_source_${editPhotoRequest.id}.png`)
    setPhoto({ file, preview: `data:image/png;base64,${editPhotoRequest.image}` })
    clearEditPhotoRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setPhoto({ file, preview: e.target.result })
    reader.readAsDataURL(file)
  }

  async function handleEdit() {
    if (!photo?.file) { setError('Please upload a photo to edit.'); return }
    if (!instruction.trim()) { setError('Please describe the edit you want.'); return }
    setError('')
    setLoading(true)
    setResult(null)

    const fd = new FormData()
    fd.append('prompt', instruction.trim())
    fd.append('image', photo.file)

    try {
      const res  = await fetch('/api/edit-photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Edit failed')

      const item = {
        id:     data.id,
        image:  data.image,
        label:  data.label || instruction.trim().slice(0, 60),
        prompt: data.prompt_used || instruction.trim(),
        provider: 'openai',
        quality:  'low',
        ratio:  'Original',
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
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${result.image}`
    a.download = `edit_${result.id}.png`
    a.click()
  }

  // Continue editing from the just-produced result, so small revisions can
  // be chained without leaving the page.
  function continueFromResult() {
    if (!result) return
    const file = base64ToFile(result.image, `edit_source_${result.id}.png`)
    setPhoto({ file, preview: `data:image/png;base64,${result.image}` })
    setInstruction('')
    setResult(null)
  }

  function handleReset() {
    setPhoto(null)
    setInstruction('')
    setResult(null)
    setError('')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Edit Photo</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Upload a single photo — or open one from History — describe the small adjustment or
          revision you want, and apply it directly to that image. Always runs on OpenAI (GPT
          Image 2) at Low quality, the cheapest tier, since this is meant for quick touch-ups
          rather than full recompositions.
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="two-col">
        {/* LEFT — Inputs */}
        <div>
          <div className="card">
            <div className="card-title">
              <span className="step-badge">1</span>
              Photo to Edit
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
              This is the actual photo that gets edited — not a creative reference. The edit is
              applied directly on top of it.
            </div>
            <UploadBox
              label="Photo"
              hint="The exact image you want adjusted"
              icon="🖼️"
              image={photo}
              onSelect={setPhoto}
              onFile={handleFile}
            />
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">2</span>
              Describe the Edit
            </div>
            <div className="form-group full">
              <label className="form-label">Instruction *</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. brighten the subject's face, remove the object in the background, make the sky more blue…"
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                rows={4}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
              🔒 Provider: OpenAI (GPT Image 2) · Quality: Low — fixed for this section to keep
              costs minimal.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-generate" onClick={handleEdit} disabled={loading} style={{ flex: 1 }}>
              {loading ? <><div className="spinner" /> Editing…</> : '✏️ Apply Edit'}
            </button>
            <button className="btn-secondary" onClick={handleReset} disabled={loading}
              style={{ padding: '14px 18px', fontSize: 13 }}>
              ↺ Reset
            </button>
          </div>
        </div>

        {/* RIGHT — Result */}
        <div className="result-panel">
          <div className="result-header">
            <span className="result-title">
              {loading ? '⏳ Editing…' : result ? '✅ Result' : '✏️ Edited Photo'}
              {result && (
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 8 }}>
                  via OpenAI (GPT Image 2) · Low quality
                </span>
              )}
            </span>
            {result && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={downloadResult}>⬇ Download</button>
                <button className="btn-secondary" onClick={continueFromResult}>✏️ Edit again</button>
                <button className="btn-secondary" onClick={() => setResult(null)}>🗑 Clear</button>
              </div>
            )}
          </div>

          <div className="result-image-wrap" style={{ minHeight: 420 }}>
            {loading ? (
              <div className="result-placeholder">
                <div className="spinner" style={{ width: 36, height: 36 }} />
                <p>Applying your edit…<br />
                  <span style={{ fontSize: 11, opacity: 0.6 }}>This usually takes 10–30 seconds</span></p>
              </div>
            ) : result ? (
              <img src={`data:image/png;base64,${result.image}`} alt={result.label} className="result-image" />
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">✏️</div>
                <p>Your edited photo will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadBox({ label, hint, icon, image, onSelect, onFile }) {
  const fileRef = useRef()
  const [dragOver, setDragOver] = useState(false)

  function pick(file) {
    if (onFile) onFile(file)
  }

  return (
    <div className="form-group">
      <label className="form-label">{label} *</label>
      <div
        className={`upload-area${dragOver ? ' drag-over' : ''}`}
        style={{ minHeight: 150, cursor: image ? 'default' : 'pointer' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]) }}
        onClick={() => !image && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => pick(e.target.files[0])}
        />
        {image ? (
          <div className="upload-preview-wrap">
            <img src={image.preview} alt={label} className="upload-preview" style={{ maxHeight: 150 }} />
            <button className="upload-clear" onClick={e => { e.stopPropagation(); onSelect(null) }}>✕</button>
          </div>
        ) : (
          <>
            <div className="upload-icon">{icon}</div>
            <div className="upload-text"><span>Click to upload</span> or drag & drop</div>
            <div className="upload-hint">{hint}</div>
          </>
        )}
      </div>
    </div>
  )
}
