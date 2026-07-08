// A small four-point sparkle mark, replacing the plain "✦" unicode glyph
// used previously — renders crisp at any size and picks up currentColor,
// so it always matches whatever text color surrounds it.
export default function Logomark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 1.5 L14.3 9.7 L22.5 12 L14.3 14.3 L12 22.5 L9.7 14.3 L1.5 12 L9.7 9.7 Z"
        fill="currentColor"
      />
    </svg>
  )
}
