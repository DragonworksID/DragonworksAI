import { useState, useRef, useEffect } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import UploadBox from '../UploadBox.jsx'

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
  const { showToast } = useToast()

  const [photo, setPhoto]   = useState(null)   // { file, preview }
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Pre-fill from a History item when opened via "Edit Photo" there. Runs
  // once on mount — History.jsx sets editPhotoRequest then navigates here.
  useEffect(() => {
    if (!editPhotoRequest) return
    const file = base64ToFile(editPhotoRequest.image, `edit_source_${editPhotoRequest.id}.png`)
    setPhoto({ file, preview: `data:image/png;base64,${editPhotoRequest.image}` })
    clearEditPhotoRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEdit() {
    if (!photo?.file) { showToast('Please upload a photo to edit.'); return }
    if (!instruction.trim()) { showToast('Please describe the edit you want.'); return }
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
        // The exact "before" photo used for this specific edit, captured at
        // generation time — so the before/after slider stays correct even
        // after "Edit again" replaces the current `photo` state with a newer
        // source image.
        sourceImage: photo.preview,
      }
      setResult(item)
      addToHistory(item)
    } catch (err) {
      showToast(err.message)
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

      <div className="two-col">
        {/* LEFT — Inputs */}
        <div>
          <div className="card">
            <div className="card-title">
              <span className="step-badge">1</span>
              Photo to Edit
            </div>
            <UploadBox
              label="Photo"
              hint="The exact image you want adjusted"
              icon="🖼️"
              image={photo}
              onSelect={setPhoto}
              minHeight={150}
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
              <div className="result-placeholder" style={{ width: '100%' }}>
                <div className="skeleton" style={{ aspectRatio: '4 / 3', maxWidth: 380, margin: '0 auto' }} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <p style={{ textAlign: 'center' }}>Applying your edit…<br />
                    <span style={{ fontSize: 11, opacity: 0.6 }}>This usually takes 10–30 seconds</span></p>
                </div>
              </div>
            ) : result ? (
              result.sourceImage ? (
                <BeforeAfterSlider before={result.sourceImage} after={`data:image/png;base64,${result.image}`} />
              ) : (
                <img src={`data:image/png;base64,${result.image}`} alt={result.label} className="result-image" />
              )
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

// Draggable before/after comparison — drag anywhere on the image (or drag
// the handle) to reveal more of the original vs. the edited version. Built
// with plain pointer events rather than a library since the interaction is
// simple: track a 0-100 position, clip the "after" layer to that width.
function BeforeAfterSlider({ before, after }) {
  const [pos, setPos] = useState(50)
  const containerRef = useRef(null)
  const draggingRef = useRef(false)

  function updateFromClientX(clientX) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }

  function handlePointerDown(e) {
    draggingRef.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    updateFromClientX(e.clientX)
  }
  function handlePointerMove(e) {
    if (!draggingRef.current) return
    updateFromClientX(e.clientX)
  }
  function handlePointerUp() {
    draggingRef.current = false
  }

  return (
    <div
      className="ba-slider"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img src={before} alt="Before" className="ba-slider-before" draggable={false} />
      <div className="ba-slider-after-wrap" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={after} alt="After" draggable={false} />
      </div>
      <div className="ba-slider-handle" style={{ left: `${pos}%` }}>
        <div className="ba-slider-handle-grip">⇔</div>
      </div>
      <div className="ba-slider-label ba-slider-label-left">Before</div>
      <div className="ba-slider-label ba-slider-label-right">After</div>
    </div>
  )
}
