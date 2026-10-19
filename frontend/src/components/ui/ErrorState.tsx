interface Props { title: string; detail?: string; retryLabel: string; onRetry: () => void }

export default function ErrorState({ title, detail, retryLabel, onRetry }: Props) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <div className="font-medium">{title}</div>
      {detail && <div className="mt-1 text-sm">{detail}</div>}
      <button type="button" onClick={onRetry} className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
        {retryLabel}
      </button>
    </div>
  )
}