import fs from 'node:fs';
import path from 'node:path';

export interface Bilingual { en: string; rw: string }
interface Entry { showAsDriver: boolean; label: Bilingual; raises: Bilingual; lowers: Bilingual }

const file = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../shared/explanations.json'), 'utf8'),
) as { features: Record<string, Entry> };

export const explanations = file.features;
export const isShownAsDriver = (feature: string) => explanations[feature]?.showAsDriver === true;
export const labelOf = (feature: string): Bilingual => explanations[feature]?.label ?? { en: feature, rw: feature };

export function sentenceOf(feature: string, direction: 'raises' | 'lowers'): Bilingual {
  const e = explanations[feature];
  if (!e) return { en: feature, rw: feature };
  return direction === 'raises' ? e.raises : e.lowers;
}