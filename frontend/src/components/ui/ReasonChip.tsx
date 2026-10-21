interface Props {
  text: string
  kind: 'raises' | 'lowers'
}

export default function ReasonChip({ text, kind }: Props) {
  const cls =
    kind === 'raises'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
  return (
    <span title={text} className={`inline-flex items-start gap-1 rounded-md border px-2 py-0.5 text-xs ${cls}`}>
      <span aria-hidden="true">{kind === 'raises' ? '↑' : '↓'}</span>
      <span>{text}</span>
    </span>
  )
}