import { useRef, useState } from 'react'

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

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => onSelect({ file, preview: e.target.result })
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
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      onClick={() => !image && fileRef.current?.click()}
      onPaste={handlePaste}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
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
          <button className="upload-clear" onClick={e => { e.stopPropagation(); onSelect(null) }}>✕</button>
        </div>
      ) : (
        <>
          <div className="upload-icon">{icon}</div>
          <div className="upload-text"><span>Click to upload</span>, drag & drop, or paste</div>
          <div className="upload-hint">{hint}</div>
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
