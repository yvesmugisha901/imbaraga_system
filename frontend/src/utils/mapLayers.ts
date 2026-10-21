import type { District } from '../types'

export type MapLayer = 'poverty' | 'access' | 'double'

/** The value a district contributes to the chosen map layer (null = no data). */
export const layerValue = (d: District, layer: MapLayer): number | null =>
  layer === 'poverty' ? d.povertyRate : layer === 'access' ? d.exclusionGap : d.doubleExclusionFlag ? 1 : 0