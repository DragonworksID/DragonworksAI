import { useRef, useState } from 'react'

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Shared image upload zone used across every page that needs one (Thumbnail
// Creator, Edit Photo, Background Creator, Quick Generate). Three ways in:
//   1. Click the box to browse for a file.
//   2. Drag & drop a file onto it.
//   3. Click/focus the box, then Ctrl+V (Cmd+V on Mac) to paste an image
//      straight from the clipboard — no file on disk needed. This works for
//      screenshots and copied images from any app, not just browser images.
// Paste needs the box to be focused first (tabIndex below) since paste
// events fire on the focused element, not the whole page — this also keeps
// behavior unambiguous when a page has two upload boxes side by side.
export default function UploadBox({
  label,
  hint,
  icon = '🖼️',
  image,
  onSelect,
  required = true,
  minHeight,
  previewMaxHeight,
}) {
  const fileRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file) {
    if (!file) return
    const hasAllowedExtension = /\.(jpe?g|png|webp)$/i.test(file.name || '')
    if (!ALLOWED_IMAGE_TYPES.has(file.type) && !(!file.type && hasAllowedExtension)) {
      setError('Please choose a PNG, JPEG, or WEBP image.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image is too large. The maximum size is 12 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      setError('')
      onSelect({ file, preview: e.target.result })
    }
    reader.onerror = () => setError('This image could not be read. Please choose another file.')
    reader.readAsDataURL(file)
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault()
        handleFile(item.getAsFile())
        return
      }
    }
  }

  const box = (
    <div
      className={`upload-area${dragOver ? ' drag-over' : ''}`}
      style={{ cursor: image ? 'default' : 'pointer', ...(minHeight ? { minHeight } : {}) }}
      tabIndex={0}
      role="button"
      aria-label={label ? `Upload ${label}` : 'Upload image'}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      onClick={() => !image && fileRef.current?.click()}
      onKeyDown={e => {
        if (!image && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          fileRef.current?.click()
        }
      }}
      onPaste={handlePaste}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
      {image ? (
        <div className="upload-preview-wrap">
          <img
            src={image.preview}
            alt={label || 'Uploaded'}
            className="upload-preview"
            style={previewMaxHeight ? { maxHeight: previewMaxHeight } : undefined}
          />
          <button type="button" className="upload-clear" aria-label="Remove image" onClick={e => { e.stopPropagation(); setError(''); onSelect(null) }}>✕</button>
        </div>
      ) : (
        <>
          <div className="upload-icon">{icon}</div>
          <div className="upload-text"><span>Click to upload</span>, drag & drop, or paste</div>
          <div className="upload-hint">{hint}</div>
          {error && <div className="upload-hint" role="alert" style={{ color: 'var(--danger, #b42318)' }}>{error}</div>}
        </>
      )}
    </div>
  )

  if (!label) return box

  return (
    <div className="form-group">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      {box}
    </div>
  )
}
