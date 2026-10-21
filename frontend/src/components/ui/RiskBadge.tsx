import { useTranslation } from 'react-i18next'
import type { RiskLevel } from '../../types'

const STYLE: Record<RiskLevel, { cls: string; glyph: string }> = {
  Low: { cls: 'bg-emerald-100 text-emerald-900 border-emerald-300', glyph: '▼' },
  Medium: { cls: 'bg-amber-100 text-amber-900 border-amber-300', glyph: '●' },
  High: { cls: 'bg-red-100 text-red-900 border-red-300', glyph: '▲' },
}

// Colour plus label plus glyph, so risk is never conveyed by colour alone.
export default function RiskBadge({ level }: { level: RiskLevel }) {
  const { t } = useTranslation()
  const s = STYLE[level]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden="true">{s.glyph}</span>
      {t(`risk.${level}`)}
    </span>
  )
}