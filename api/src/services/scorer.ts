import type { Household } from '../validators/household';
import { MockScorer } from './mockScorer';

export interface RawDriver {
  feature: string;
  value: number | string;
  shap: number;
  direction: 'raises' | 'lowers';
}
export interface RawScore {
  id: string;
  probability: number;
  drivers: RawDriver[];           // up to 3 features pushing toward poverty, largest first
  protective: RawDriver | null;   // strongest protective factor, if any
}
export interface Scorer {
  readonly isMock: boolean;
  modelVersion(): Promise<string>;
  score(rows: Household[]): Promise<RawScore[]>;
}

export class ScorerUnavailableError extends Error {}

/** Calls the Python FastAPI service (POST /predict). Contract follows plan section 10.2. */
class HttpScorer implements Scorer {
  readonly isMock = false;
  constructor(private readonly baseUrl: string) {}

  private async call(path: string, init?: RequestInit): Promise<unknown> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`ML service returned ${res.status}`);
      return await res.json();
    } catch (err) {
      throw new ScorerUnavailableError(`ML service unavailable: ${(err as Error).message}`);
    }
  }

  async modelVersion() {
    const h = (await this.call('/health')) as { modelVersion?: string };
    return h.modelVersion ?? 'unknown';
  }

  async score(rows: Household[]): Promise<RawScore[]> {
    const out = (await this.call('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ households: rows }),
    })) as RawScore[] | { results: { id: string; probability: number; drivers: RawDriver[] }[] };
    const items = Array.isArray(out) ? out : out.results;
    if (!Array.isArray(items) || items.length !== rows.length) {
      throw new ScorerUnavailableError('ML service returned an unexpected response');
    }
    return items.map((it) => ({
      id: it.id,
      probability: it.probability,
      drivers: it.drivers.filter((d) => d.direction === 'raises').slice(0, 3),
      protective: it.drivers.find((d) => d.direction === 'lowers') ?? null,
    }));
  }
}

export function getScorer(): Scorer {
  const url = process.env.ML_SERVICE_URL;
  return url ? new HttpScorer(url.replace(/\/$/, '')) : new MockScorer();
}