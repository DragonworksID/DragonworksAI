import { useState, useRef, useEffect, useCallback } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import { apiFetch } from '../api.js'
import { CONTENT_TYPES, contentTypeLabel } from '../contentTypes.js'

// Conversation starters. These replace the structural scaffolding an earlier
// design would have provided (duration budgets, segment schemas) — for a
// chat-only feature, good presets are what stop editors from staring at an
// empty box. Written for the actual use case: short TikTok/Reels video.
const PRESETS = [
  { icon: '🎬', label: 'Script TikTok 30 detik',
    text: 'Bikin script TikTok 30 detik untuk produk [ISI PRODUK]. Target penonton anak muda, tone santai.' },
  { icon: '🪝', label: 'Hook 3 detik',
    text: 'Kasih 3 opsi hook 3 detik yang bikin orang berhenti scroll untuk video tentang [ISI TOPIK]. Bedakan sudut pendekatannya.' },
  { icon: '🛒', label: 'Live-commerce',
    text: 'Bikin script live-commerce buat host, durasi sekitar 1 menit, produk [ISI PRODUK]. Tone santai dan persuasif.' },
  { icon: '🎙️', label: 'Voice-over korporat',
    text: 'Bikin script voice-over Reels untuk brand korporat tentang [ISI TOPIK]. Pakai "Anda", tone profesional tapi tetap hangat.' },
  { icon: '✂️', label: 'Versi lebih pendek',
    text: 'Potong script barusan jadi lebih pendek, tapi hook dan CTA-nya jangan hilang.' },
  { icon: '😎', label: 'Bikin lebih santai',
    text: 'Ubah script barusan jadi lebih santai dan ngobrol, kayak orang cerita ke temannya.' },
]

const THREAD_STORAGE_KEY = 'dragonworks:script-thread'
const TYPE_STORAGE_KEY   = 'dragonworks:script-type'

// The Render free plan spins the service down when idle, so the first request
// after a quiet period can take ~30s. A generic spinner reads as a hang, so
// after this long we switch the label to something that explains the wait.
const COLD_START_HINT_MS = 8000

function loadThread() {
  try {
    const raw = sessionStorage.getItem(THREAD_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function ScriptGenerator() {
  const { addScript } = useHistory()
  const toast = useToast()

  // Thread lives in React state and is mirrored to sessionStorage — a refresh
  // (or a backend restart, which happens on every redeploy) shouldn't wipe an
  // hour of consulting. Nothing server-side holds conversation state.
  const [messages, setMessages] = useState(loadThread)
  // Sent with every turn rather than stated once in the opening message —
  // the format is what shapes the beats, and in a long refinement thread the
  // model would otherwise drift off whatever was said at the start.
  const [contentType, setContentType] = useState(() => {
    try { return sessionStorage.getItem(TYPE_STORAGE_KEY) || '' } catch { return '' }
  })
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [slow, setSlow]         = useState(false)
  const [error, setError]       = useState('')

  const threadRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(messages))
    } catch { /* storage full or blocked — the thread just won't survive a refresh */ }
  }, [messages])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (!loading) { setSlow(false); return }
    const timer = setTimeout(() => setSlow(true), COLD_START_HINT_MS)
    return () => clearTimeout(timer)
  }, [loading])

  const send = useCallback(async (text) => {
    const content = (text ?? '').trim()
    if (!content || loading) return

    setError('')
    const outgoing = [...messages, { role: 'user', content, ts: new Date().toLocaleTimeString() }]
    setMessages(outgoing)
    setInput('')
    setLoading(true)

    try {
      const res = await apiFetch('/api/script', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Strip the local-only `ts` field before sending — the API validates
        // strictly and rejects unexpected roles, so keep the shape clean.
        body: JSON.stringify({
          messages: outgoing.map(m => ({ role: m.role, content: m.content })),
          content_type: contentType || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Gagal menghubungi asisten naskah')

      const reply = {
        role:    'assistant',
        content: data.reply,
        ts:      new Date().toLocaleTimeString(),
        id:      data.id,
      }
      setMessages(prev => [...prev, reply])
      addScript({
        id:      data.id,
        kind:    'script',
        type:    contentType,
        label:   content.slice(0, 80),
        content: data.reply,
        model:   data.model,
        ts:      new Date().toLocaleString(),
      })
    } catch (err) {
      setError(err.message)
      // Put the message back in the box so a failed send doesn't lose the
      // editor's typing.
      setInput(content)
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }, [messages, loading, addScript, contentType])

  function changeContentType(value) {
    setContentType(value)
    try { sessionStorage.setItem(TYPE_STORAGE_KEY, value) } catch { /* ignore */ }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function usePreset(preset) {
    setInput(preset.text)
    textareaRef.current?.focus()
  }

  function copy(text) {
    navigator.clipboard?.writeText(text)
      .then(() => toast?.showToast('Naskah disalin ke clipboard', 'success'))
      .catch(() => toast?.showToast('Gagal menyalin', 'error'))
  }

  function downloadThread() {
    const body = messages
      .map(m => `${m.role === 'user' ? 'EDITOR' : 'ASISTEN'} (${m.ts || ''})\n${m.content}`)
      .join('\n\n' + '─'.repeat(56) + '\n\n')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `script_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearThread() {
    setMessages([])
    setError('')
    try { sessionStorage.removeItem(THREAD_STORAGE_KEY) } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Script Generator</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Asisten naskah untuk video pendek TikTok &amp; Reels. Jelaskan kebutuhanmu, minta revisi
          sebanyak yang perlu — semua balasan dalam Bahasa Indonesia. Percakapan tersimpan selama
          tab ini terbuka.
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="script-layout">
        {/* ── Conversation ─────────────────────────────── */}
        <div className="chat-panel">
          <div className="chat-header">
            <span className="result-title">
              {loading ? '⏳ Menulis…' : '💬 Percakapan'}
            </span>
            {messages.length > 0 && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={downloadThread}>⬇ Unduh .txt</button>
                <button className="btn-secondary" onClick={clearThread}>🗑 Mulai baru</button>
              </div>
            )}
          </div>

          <div className="chat-thread" ref={threadRef}>
            {messages.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3>Mulai dari sini</h3>
                <p>
                  Ketik brief-mu di bawah, atau pilih salah satu template di samping.<br />
                  Contoh: “Bikin script TikTok 30 detik untuk laptop gaming, tone santai.”
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <ChatBubble key={i} message={m} onCopy={() => copy(m.content)} />
              ))
            )}

            {loading && (
              <div className="chat-row chat-row-assistant">
                <div className="chat-bubble chat-bubble-assistant chat-bubble-typing">
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                  <span>{slow ? 'Menyalakan server, sebentar ya…' : 'Menulis naskah…'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-composer">
            <div className="composer-type-row">
              <label className="composer-type-label" htmlFor="content-type">Jenis konten</label>
              <select
                id="content-type"
                className="form-select composer-type-select"
                value={contentType}
                onChange={e => changeContentType(e.target.value)}
              >
                {CONTENT_TYPES.map(t => (
                  <option key={t.key || 'general'} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Tulis brief atau minta revisi…  (Enter kirim, Shift+Enter baris baru)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={6000}
              rows={3}
              disabled={loading}
            />
            <button
              className="btn-generate chat-send"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
            >
              {loading ? <><div className="spinner" /> Menulis…</> : '➤ Kirim'}
            </button>
          </div>
        </div>

        {/* ── Templates + guardrail note ───────────────── */}
        <div>
          <div className="card">
            <div className="card-title">Template Cepat</div>
            <div className="preset-chip-list">
              {PRESETS.map((p, i) => (
                <button key={i} className="preset-chip" onClick={() => usePreset(p)}>
                  <span className="preset-chip-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            <div className="script-note" style={{ marginTop: 14 }}>
              Template hanya mengisi kotak ketik — kamu masih bisa mengubahnya sebelum kirim.
            </div>
          </div>

          <div className="card">
            <div className="card-title">Sebelum Dikirim ke Klien</div>
            <div className="script-note">
              ⚠️ Asisten ini <strong>tidak boleh</strong> mengarang spesifikasi, harga, diskon, atau
              klaim performa — kalau butuh, dia akan menulis placeholder seperti <code>[HARGA]</code>.
              Tetap cek ulang semua angka dan klaim produk sebelum naskah dipakai untuk brand klien.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message, onCopy }) {
  const isUser = message.role === 'user'
  return (
    <div className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-assistant'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
        {/* Rendered as plain text on purpose. React escapes this by default;
            if a Markdown renderer is ever added here, sanitize it first. */}
        <div className="chat-bubble-text">{message.content}</div>
        <div className="chat-bubble-meta">
          <span>{message.ts}</span>
          {!isUser && (
            <button className="chat-copy-btn" onClick={onCopy} title="Salin naskah">
              📋 Salin
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
