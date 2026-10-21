export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api${path}`, init)
  } catch {
    throw new ApiError('Cannot reach the server', 0, 'NETWORK')
  }
  if (!res.ok) {
    let message = res.statusText
    let code: string | undefined
    let details: unknown
    try {
      const body = await res.json()
      message = body?.error?.message ?? message
      code = body?.error?.code
      details = body?.error?.details
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(message, res.status, code, details)
  }
  return (await res.json()) as T
}

export const apiGet = <T>(path: string) => request<T>(path)

export const apiPostText = <T>(path: string, body: string, contentType = 'text/csv') =>
  request<T>(path, { method: 'POST', headers: { 'Content-Type': contentType }, body })