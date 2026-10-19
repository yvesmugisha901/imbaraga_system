interface Props {
  label: string
  value: string | null
  pendingLabel: string
  note?: string
  loading?: boolean
}

export default function KpiCard({ label, value, pendingLabel, note, loading }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-600">{label}</div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-200" aria-hidden="true" />
      ) : value === null ? (
        <div className="mt-1 text-lg font-medium text-slate-400">{pendingLabel}</div>
      ) : (
        <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      )}
      {note && !loading && <div className="mt-1 text-xs text-slate-500">{note}</div>}
    </div>
  )
}