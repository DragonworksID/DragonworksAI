// The six short-form formats the content team produces. Shared by Script
// Generator and Caption Generator so the list stays in one place — the keys
// must match CONTENT_TYPES in backend/main.py, which is what actually
// changes the model's beat structure.
export const CONTENT_TYPES = [
  { key: '',              label: 'Umum (tanpa jenis khusus)' },
  { key: 'education',     label: '📚 Education' },
  { key: 'ugc',           label: '🤳 UGC / Testimoni' },
  { key: 'review',        label: '⭐ Product Review' },
  { key: 'engagement',    label: '🎉 Engagement / Fun' },
  { key: 'storytelling',  label: '📖 Storytelling' },
  { key: 'tips',          label: '💡 Tips & Trik' },
]

export function contentTypeLabel(key) {
  return CONTENT_TYPES.find(t => t.key === key)?.label || 'Umum'
}
