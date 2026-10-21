// Minimal GeoJSON helpers for an offline SVG choropleth (no map library, no tiles).

interface Geometry { type: string; coordinates: unknown }
export interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: Geometry | null }
export interface GeoCollection { type: 'FeatureCollection'; features: GeoFeature[] }

const NAME_KEYS = ['shapeName', 'NAME_2', 'name', 'Name', 'district', 'District', 'ADM2_EN', 'admin2Name', 'ADM2_NAME']

export function featureName(f: GeoFeature): string | null {
  for (const k of NAME_KEYS) {
    const v = f.properties?.[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** "Nyarugenge District" and "Nyarugenge" compare equal. */
export const normaliseName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\bdistrict\b/g, '').replace(/[^a-z]/g, '')

function ringsOf(g: Geometry | null): number[][][] {
  if (!g) return []
  if (g.type === 'Polygon') return g.coordinates as number[][][]
  if (g.type === 'MultiPolygon') return (g.coordinates as number[][][][]).flat()
  return []
}

export interface MapShape { index: number; name: string | null; d: string }

export function buildShapes(fc: GeoCollection, width = 520, height = 460, pad = 8): MapShape[] {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const f of fc.features) {
    for (const ring of ringsOf(f.geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  if (!Number.isFinite(minLon)) return []
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180) // shrink longitude to keep proportions
  const w = (maxLon - minLon) * kx
  const h = maxLat - minLat
  const scale = Math.min((width - 2 * pad) / w, (height - 2 * pad) / h)
  const ox = pad + (width - 2 * pad - w * scale) / 2
  const oy = pad + (height - 2 * pad - h * scale) / 2
  const px = (lon: number) => (ox + (lon - minLon) * kx * scale).toFixed(1)
  const py = (lat: number) => (oy + (maxLat - lat) * scale).toFixed(1)

  return fc.features.map((f, index) => ({
    index,
    name: featureName(f),
    d: ringsOf(f.geometry)
      .map((ring) => 'M' + ring.map(([lon, lat]) => `${px(lon)},${py(lat)}`).join('L') + 'Z')
      .join(''),
  }))
}

export interface Matched {
  byCode: Map<string, number> // district code -> feature index
  unmatchedFeatures: string[]
  unmatchedDistricts: string[]
}

export function matchDistricts(names: (string | null)[], districts: { code: string; nameEn: string }[]): Matched {
  const lookup = new Map<string, string>()
  for (const d of districts) {
    lookup.set(normaliseName(d.nameEn), d.code)
    lookup.set(normaliseName(d.code), d.code)
  }
  const byCode = new Map<string, number>()
  const unmatchedFeatures: string[] = []
  names.forEach((n, i) => {
    const code = n ? lookup.get(normaliseName(n)) : undefined
    if (code && !byCode.has(code)) byCode.set(code, i)
    else unmatchedFeatures.push(n ?? `(feature ${i + 1} has no name)`)
  })
  const unmatchedDistricts = districts.filter((d) => !byCode.has(d.code)).map((d) => d.nameEn)
  return { byCode, unmatchedFeatures, unmatchedDistricts }
}

const GREEN = [22, 163, 74], AMBER = [245, 158, 11], RED = [220, 38, 38]
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

/** One consistent risk scale: green (low) -> amber -> red (high). t in [0, 1]. */
export function riskColor(t: number): string {
  const x = Math.max(0, Math.min(1, t))
  const c = x < 0.5 ? mix(GREEN, AMBER, x * 2) : mix(AMBER, RED, (x - 0.5) * 2)
  return `rgb(${c[0]},${c[1]},${c[2]})`
}