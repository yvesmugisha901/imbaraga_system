export interface ShapItem {
  label: string
  value: number // positive raises risk, negative lowers it
}

interface Props {
  items: ShapItem[]
  axisLabel: string
}

// Diverging bars: red to the right raises risk, green to the left lowers it.
export default function ShapBar({ items, axisLabel }: Props) {
  const max = Math.max(0.0001, ...items.map((i) => Math.abs(i.value)))
  return (
    <figure>
      <ul className="space-y-3">
        {items.map((it) => {
          const pct = (Math.abs(it.value) / max) * 100
          const up = it.value >= 0
          return (
            <li key={it.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{it.label}</span>
                <span className={`tabular-nums font-medium ${up ? 'text-red-700' : 'text-emerald-700'}`}>
                  {up ? '+' : '−'}{Math.abs(it.value).toFixed(2)}
                </span>
              </div>
              <div className="flex h-3 items-center" role="img" aria-label={`${it.label}: ${up ? '+' : '−'}${Math.abs(it.value).toFixed(2)}`}>
                <div className="flex h-full w-1/2 justify-end">
                  {!up && <div className="h-full rounded-l bg-emerald-500" style={{ width: `${pct}%` }} />}
                </div>
                <div className="h-5 w-px bg-slate-400" />
                <div className="flex h-full w-1/2">
                  {up && <div className="h-full rounded-r bg-red-500" style={{ width: `${pct}%` }} />}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <figcaption className="mt-2 text-xs text-slate-500">{axisLabel}</figcaption>
    </figure>
  )
}
