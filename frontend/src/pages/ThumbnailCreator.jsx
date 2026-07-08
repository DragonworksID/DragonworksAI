import { useState } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import UploadBox from '../UploadBox.jsx'

// Locked pending further rollout — see the "AI Provider" card and "Image
// Quality" row below for where these are enforced in the UI.
const GEMINI_LOCKED = true
const HIGH_QUALITY_LOCKED = true

// ── Brand presets ────────────────────────────────────────────
// Each preset has a SEPARATE prompt per provider, on purpose:
// - `gemini` is heavily scaffolded to work around Nano Banana's specific
//   failure modes (flat pasting, wrong product angle, cartoon backgrounds).
// - `openai` is the original brief as written/tested for ChatGPT/GPT Image 2
//   — sent through unmodified, since that model already follows it well and
//   piling Gemini-specific guardrails on top would just be noise.
// The "{{HEADLINE}}" token gets swapped for whatever the user typed in the
// Headline field when the preset is applied, using whichever provider is
// currently selected.
const PRESETS = [
  {
    id: 'lenovo-sp',
    brand: 'Lenovo-SP',
    templates: {
      gemini: `Re-render this as ONE newly photographed image — not a cutout pasted onto a background. Vertical, 1080x1440px.
Subject identity lock: keep the talent's face, pose, expression, and the product's EXACT shape, branding, and — critically — its exact camera angle/side/view from the Base Photo. If the Base Photo shows the back of the device, the output must also show the back of the device; never invent a front view, a screen/display image, or any surface not visible in the original photo. Natural skin texture, no plastic/AI-face look.
Relight the subject from scratch (lighting/shadow/color-grade only — never the object's shape, pose, or visible side): warm, bright studio key light from the upper-left, soft fill light, soft natural shadow cast onto the surface/floor beneath them, so they look physically standing/sitting in the new scene (not floating on top of it).
Grounding surface: place the subject on a clearly visible, photographically real surface (e.g. a light wood or pale desk/tabletop) with a soft, correctly-angled contact shadow directly beneath them — never leave them floating in front of an abstract backdrop with no ground plane.
New background: do NOT reuse the Background Photo's flat illustrated/clip-art look directly, and do NOT render its colorful shapes as flat, hard-edged, vector/sticker graphics. Instead, build a real, softly-blurred lifestyle studio backdrop using its color palette (read the dominant colors from the Background Photo and reuse them as gradient/lighting colors) rendered as genuine photographic bokeh — softly out of focus, feathered edges, natural light falloff, as if captured by a real camera lens, never a crisp cartoon outline. Fill the scene generously — do not leave large areas of empty space. Include 5-7 real-world props spread across foreground, midground and background (e.g. stacked notebooks, a small potted plant, pens/pencils in a holder, sticky notes, headphones, a mug, a phone) so the frame reads as a richly styled, busy desk/lifestyle scene, not a product floating alone.
Integration check: the subject's edge lighting, shadow direction, and color temperature must match the new background exactly, and the whole image (subject, props, background) must share one consistent light source and color grade — if it looks like two separate photos stacked together, redo it.
Headline text: place "{{HEADLINE}}" across the top third of the image, split across 2-3 stacked lines. Large, bold, rounded sans-serif (TikTok/Shorts thumbnail style). Thick white stroke outline (~10px) and soft dark drop shadow on every line for a slight 3D pop. Color the first line white, the second line bright yellow, and the final/most important word in vibrant pink or magenta.
Final look: premium commercial photography quality, sharp focus, energetic and youthful mood, clean spacing, readable in under 1 second on mobile.`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo product + Background reference image (replace the product's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look with a "Colorful Days" themed background, ensuring the talent's face is clear and bright; add a raised, colorful effect beside or in front of the talent without obscuring them.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: Keep the product and subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect,  No cartoon effect
Enhance: Natural lighting Product visibility Sharpness Contrast Product
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Headline Subject Product Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
  {
    id: 'lenovo-p',
    brand: 'Lenovo-P',
    templates: {
      gemini: `Re-render this as ONE newly photographed image — not a cutout pasted onto a background. Vertical, 1080x1440px. No people in frame.
Subject identity lock: keep the product's EXACT shape, packaging, color, branding, and — critically — its exact camera angle/side/view from the Base Photo unaltered. If the Base Photo shows the back of the device, the output must also show the back of the device; never invent a front view, a screen/display image, or any surface not visible in the original photo.
Relight the product from scratch (lighting/shadow/color-grade only — never the object's shape or visible side): warm, bright studio key light from the upper-left, soft fill light, soft natural shadow cast onto the surface beneath it, so it looks physically placed in the new scene (not floating on top of it).
Grounding surface: place the product on a clearly visible, photographically real surface (e.g. a light wood or pale desk/tabletop) with a soft, correctly-angled contact shadow directly beneath it — never leave it floating in front of an abstract backdrop with no ground plane.
New background: do NOT reuse the Background Photo's flat illustrated/clip-art look directly, and do NOT render its colorful shapes as flat, hard-edged, vector/sticker graphics. Instead, build a real, softly-blurred lifestyle studio backdrop using its color palette (read the dominant colors from the Background Photo and reuse them as gradient/lighting colors) rendered as genuine photographic bokeh — softly out of focus, feathered edges, natural light falloff, as if captured by a real camera lens, never a crisp cartoon outline. Fill the scene generously — do not leave large areas of empty space. Include 5-7 real-world props spread across foreground, midground and background (e.g. stacked notebooks, a small potted plant, pens/pencils in a holder, sticky notes, headphones, a mug, a phone) so the frame reads as a richly styled, busy desk/lifestyle scene, not a product floating alone.
Integration check: the product's edge lighting, shadow direction, and color temperature must match the new background exactly, and the whole image (product, props, background) must share one consistent light source and color grade — if it looks like two separate photos stacked together, redo it.
Headline text: place "{{HEADLINE}}" across the top third of the image, split across 2-3 stacked lines. Large, bold, rounded sans-serif (TikTok/Shorts thumbnail style). Thick white stroke outline (~10px) and soft dark drop shadow on every line for a slight 3D pop. Color the first line white, the second line bright yellow, and the final/most important word in vibrant pink or magenta.
Final look: premium commercial photography quality, sharp focus, energetic and youthful mood, clean spacing, readable in under 1 second on mobile.`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Product photo + Background reference image (replace the product's background with the background reference image)
OBJECTIVE: Transform the product photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look with a "Colorful Days" themed background; add a raised, colorful effect beside or behind the product without obscuring any part of it.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings, Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting Product visibility Sharpness Contrast
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Headline Product Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
]

export default function ThumbnailCreator() {
  const { addToHistory } = useHistory()
  const { showToast } = useToast()

  const [bgImage, setBgImage]     = useState(null)   // { file, preview } — campaign background
  const [baseImage, setBaseImage] = useState(null)   // { file, preview } — talent photo
  const [headline, setHeadline]   = useState('')
  const [notes, setNotes]         = useState('')
  const [presetPrompt, setPresetPrompt]     = useState('')   // filled preset text, overrides notes when set
  const [activePresetId, setActivePresetId] = useState(null)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  // Default provider is OpenAI at Low quality with enrichment off — the
  // lowest-cost combination — since Gemini and High quality are locked below
  // to control spend. Flip GEMINI_LOCKED/HIGH_QUALITY_LOCKED above to
  // re-enable either once you're ready.
  const [provider, setProvider]   = useState('openai')   // 'gemini' | 'openai'
  const [quality, setQuality]     = useState('low')       // OpenAI only: 'low' | 'medium' | 'high'
  const [enrichPrompt, setEnrichPrompt] = useState(false)  // OpenAI only: ChatGPT-style prompt rewrite on/off

  function handleApplyPreset(preset) {
    if (!headline.trim()) {
      showToast('Please type the Headline first, then apply a brand preset.')
      return
    }
    const tpl = preset.templates[provider] || preset.templates.gemini
    const filled = tpl.replace('{{HEADLINE}}', headline.trim())
    setPresetPrompt(filled)
    setActivePresetId(preset.id)
  }

  function handleClearPreset() {
    setPresetPrompt('')
    setActivePresetId(null)
  }

  async function handleGenerate() {
    if (!baseImage?.file) { showToast('Please upload the Subject / Product Reference photo.'); return }
    if (!bgImage?.file)  { showToast('Please upload the Mood & Style Reference photo.'); return }
    if (!headline.trim()) { showToast('Please enter the Headline text.'); return }
    setLoading(true)
    setResult(null)
    setShowPrompt(false)

    const fd = new FormData()
    fd.append('headline', headline)
    fd.append('provider', provider)
    if (provider === 'openai') {
      fd.append('quality', quality)
      fd.append('enrich_prompt', enrichPrompt ? '1' : '0')
    }
    fd.append('background_image', bgImage.file)
    fd.append('base_image', baseImage.file)
    if (presetPrompt.trim()) {
      fd.append('custom_prompt', presetPrompt)
    } else {
      fd.append('notes', notes)
    }

    try {
      const res  = await fetch('/api/thumbnail', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')

      const item = {
        id:       data.id,
        image:    data.image,
        label:    data.label,
        prompt:   data.prompt_used || '',
        provider: data.provider_used || provider,
        quality:  data.quality_used || null,
        enrichmentUsed:  data.enrichment_used ?? null,   // OpenAI only: true/false/null
        enrichmentError: data.enrichment_error || null,
        ratio:    '1080x1440',
        ts:       new Date().toLocaleTimeString(),
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
    a.download = `thumb_${result.id}.png`
    a.click()
  }

  function handleReset() {
    setBgImage(null)
    setBaseImage(null)
    setHeadline('')
    setNotes('')
    setPresetPrompt('')
    setActivePresetId(null)
    setResult(null)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Thumbnail Creator</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Upload this month's campaign background and the talent's base photo, type the headline,
          and get a ready-to-use 1080×1440 thumbnail.
        </div>
      </div>

      <div className="two-col">
        {/* LEFT — Inputs */}
        <div>
          <div className="card">
            <div className="card-title">AI Provider</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
              OpenAI (GPT Image 2) is the active provider. Gemini is temporarily locked to control spend.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                disabled={GEMINI_LOCKED}
                title={GEMINI_LOCKED ? 'Gemini is temporarily locked to control costs.' : undefined}
                style={GEMINI_LOCKED
                  ? { opacity: 0.5, cursor: 'not-allowed' }
                  : (provider === 'gemini' ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined)}
                onClick={() => !GEMINI_LOCKED && setProvider('gemini')}
              >
                {GEMINI_LOCKED ? '🔒 ' : provider === 'gemini' ? '✓ ' : ''}Gemini (Nano Banana Pro) — Locked
              </button>
              <button
                className="btn-secondary"
                style={provider === 'openai' ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                onClick={() => setProvider('openai')}
              >
                {provider === 'openai' ? '✓ ' : ''}OpenAI (GPT Image 2) — costs below are estimates only
              </button>
            </div>

            {provider === 'openai' && (
              <div style={{ marginTop: 12 }}>
                <div className="error-banner" style={{ fontSize: 11, marginBottom: 10 }}>
                  <span>⚠️</span>
                  <span>
                    These per-image costs are NOT flat/guaranteed. Generation now runs through
                    OpenAI's Responses API, which bills your reference photos as extra input tokens
                    plus orchestration tokens on top of the image render — actual cost can run
                    noticeably higher than shown here. Check your OpenAI usage dashboard for real
                    spend; check <code>/api/health</code> for which call path is active.
                  </span>
                </div>
                <div className="form-label" style={{ marginBottom: 6 }}>Image Quality</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'low',    label: 'Low',    cost: '~$0.005/image' },
                    { key: 'medium', label: 'Medium', cost: '~$0.041/image' },
                    { key: 'high',   label: 'High',   cost: '~$0.165/image', locked: HIGH_QUALITY_LOCKED },
                  ].map(q => (
                    <button
                      key={q.key}
                      className="btn-secondary"
                      disabled={q.locked}
                      title={q.locked ? 'High quality is temporarily locked to control costs.' : undefined}
                      style={q.locked
                        ? { opacity: 0.5, cursor: 'not-allowed' }
                        : (quality === q.key ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined)}
                      onClick={() => !q.locked && setQuality(q.key)}
                    >
                      {q.locked ? '🔒 ' : quality === q.key ? '✓ ' : ''}{q.label} <span style={{ opacity: 0.6, fontSize: 10 }}>{q.cost}</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                  Low is the default to keep costs minimal. Medium is available for when quality needs
                  a bump — High is temporarily locked.
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enrichPrompt}
                      onChange={e => setEnrichPrompt(e.target.checked)}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Enrich prompt (ChatGPT-style rewrite)</span>
                  </label>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                    {enrichPrompt
                      ? 'On: your preset is rewritten into a more vivid, concrete brief before it’s sent — mirrors what ChatGPT quietly does to every prompt you type there.'
                      : 'Off: sends your preset completely RAW and unmodified, exactly as written below — useful for comparing against the enriched version.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">1</span>
              Reference Images
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
              Both photos are creative references, not pieces to literally paste together — the AI
              invents a brand-new photograph inspired by them, keeping the subject/product recognizable
              and borrowing the mood/colors/style cues from the other.
            </div>
            <div className="form-grid">
              <UploadBox
                label="Subject / Product Reference"
                hint="Who or what must stay recognizable"
                icon="🧑"
                image={baseImage}
                onSelect={setBaseImage}
                minHeight={150}
                previewMaxHeight={150}
              />
              <UploadBox
                label="Mood & Style Reference"
                hint="Colors, vibe, and creative direction to draw from"
                icon="🎨"
                image={bgImage}
                onSelect={setBgImage}
                minHeight={150}
                previewMaxHeight={150}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">2</span>
              Headline & Notes
            </div>

            <div className="form-group full" style={{ marginBottom: 14 }}>
              <label className="form-label">Headline *</label>
              <input
                className="form-input"
                placeholder="e.g. RAHASIA PEKERJA PRODUKTIF"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>

            {!presetPrompt && (
              <div className="form-group full">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. headline colorful & timbul di samping talent, tidak menutupi wajah…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
              📐 Output ratio is fixed at <strong>1080×1440 (3:4)</strong>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">3</span>
              Brand Presets
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
              Fill in the Headline above, then click a brand to auto-fill its full prompt below.
              Each preset has a version tuned for the AI Provider selected above — if you switch
              providers after applying one, click the brand again to load the matching version.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  className="btn-secondary"
                  style={activePresetId === p.id ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                  onClick={() => handleApplyPreset(p)}
                >
                  {activePresetId === p.id ? '✓ ' : ''}{p.brand}
                </button>
              ))}
            </div>

            {presetPrompt && (
              <div style={{ marginTop: 14 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  Active Preset Prompt — editable
                </div>
                <textarea
                  className="form-textarea"
                  value={presetPrompt}
                  onChange={e => setPresetPrompt(e.target.value)}
                  rows={8}
                  style={{ fontSize: 11, lineHeight: 1.5 }}
                />
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={handleClearPreset}
                >
                  ✕ Clear preset
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-generate" onClick={handleGenerate} disabled={loading} style={{ flex: 1 }}>
              {loading ? <><div className="spinner" /> Generating…</> : '🖼️ Generate Thumbnail'}
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
              {loading ? '⏳ Generating…' : result ? '✅ Result' : '🎨 Thumbnail'}
              {result?.provider && (
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 8 }}>
                  via {result.provider === 'openai' ? 'OpenAI (GPT Image 2)' : 'Gemini (Nano Banana Pro)'}
                  {result.quality && ` · ${result.quality} quality`}
                </span>
              )}
            </span>
            {result && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={downloadResult}>⬇ Download</button>
                <button className="btn-secondary" onClick={() => setResult(null)}>🗑 Clear</button>
              </div>
            )}
          </div>

          <div className="result-image-wrap" style={{ minHeight: 420 }}>
            {loading ? (
              <div className="result-placeholder" style={{ width: '100%' }}>
                <div className="skeleton" style={{ aspectRatio: '3 / 4', maxWidth: 320, margin: '0 auto' }} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <p style={{ textAlign: 'center' }}>Compositing your thumbnail…<br />
                    <span style={{ fontSize: 11, opacity: 0.6 }}>This usually takes 10–30 seconds</span></p>
                </div>
              </div>
            ) : result ? (
              <img src={`data:image/png;base64,${result.image}`} alt={result.label} className="result-image" />
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">🖼️</div>
                <p>Your 1080×1440 thumbnail will appear here</p>
              </div>
            )}
          </div>

          {result?.provider === 'openai' && result.enrichmentUsed === false && (
            <div className="error-banner" style={{ marginTop: 12, fontSize: 11 }}>
              <span>⚠️</span>
              <span>
                ChatGPT-style prompt enrichment did NOT run for this generation — the raw
                preset was sent as-is. Reason: {result.enrichmentError || 'unknown'}.
                Check the backend terminal for a matching <code>[enrich_openai_prompt]</code> log line.
              </span>
            </div>
          )}
          {result?.provider === 'openai' && result.enrichmentUsed === true && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
              ✅ ChatGPT-style prompt enrichment ran successfully for this generation.
            </div>
          )}

          {result?.prompt && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn-secondary"
                style={{ fontSize: 11 }}
                onClick={() => setShowPrompt(v => !v)}
              >
                {showPrompt ? '▲ Hide' : '▼ Show'} prompt actually sent to the AI
              </button>
              {showPrompt && (
                <textarea
                  className="form-textarea"
                  readOnly
                  value={result.prompt}
                  rows={10}
                  style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5 }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
