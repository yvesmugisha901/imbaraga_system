const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`)
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.error?.message ?? message
    } catch {
      /* response had no JSON body */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}