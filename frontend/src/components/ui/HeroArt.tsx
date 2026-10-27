// Decorative hero illustration: rolling hills, homes, a map pin and an early-warning marker.
export default function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 240" aria-hidden="true" focusable="false" className={className}>
      <circle cx="330" cy="52" r="22" fill="#fef3c7" />
      <path d="M0 150 C60 110 120 120 180 140 S300 118 400 98 V240 H0 Z" fill="#d1fae5" />
      <path d="M0 182 C80 142 150 172 220 160 S340 138 400 150 V240 H0 Z" fill="#a7f3d0" />
      <path d="M0 212 C90 188 170 207 250 197 S350 187 400 192 V240 H0 Z" fill="#6ee7b7" opacity="0.85" />

      {/* homes: stable, close to poverty, poor, stable */}
      <g transform="translate(72 150)">
        <rect width="28" height="20" fill="#fff" stroke="#cbd5e1" />
        <polygon points="-3,0 14,-13 31,0" fill="#cbd5e1" />
      </g>
      <g transform="translate(150 168)">
        <rect width="28" height="20" fill="#fff" stroke="#cbd5e1" />
        <polygon points="-3,0 14,-13 31,0" fill="#fcd34d" />
      </g>
      <g transform="translate(248 160)">
        <rect width="28" height="20" fill="#fff" stroke="#cbd5e1" />
        <polygon points="-3,0 14,-13 31,0" fill="#d97706" />
      </g>
      <g transform="translate(318 178)">
        <rect width="28" height="20" fill="#fff" stroke="#cbd5e1" />
        <polygon points="-3,0 14,-13 31,0" fill="#cbd5e1" />
      </g>

      {/* map pin above the close-to-poverty home */}
      <g transform="translate(164 118)">
        <path d="M0 0 c-8 0 -14 6 -14 14 c0 10 14 24 14 24 s14 -14 14 -24 c0 -8 -6 -14 -14 -14z" fill="#047857" />
        <circle cy="14" r="5" fill="#fff" />
      </g>

      {/* early-warning marker above the poor home */}
      <g transform="translate(262 130)">
        <circle r="10" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
        <path d="M0 -5 V1.5 M0 5 V5.1" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* dotted link from pin to warning */}
      <path d="M178 124 C205 100 235 108 252 128" fill="none" stroke="#047857" strokeWidth="1.5" strokeDasharray="3 4" />
    </svg>
  )
}