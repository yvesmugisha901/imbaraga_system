import type { Household } from '../validators/household';
import { isShownAsDriver } from './explanations';
import type { RawDriver, RawScore, Scorer } from './scorer';

/**
 * MOCK scorer, used until the Python ML service is connected.
 *
 * It is an additive log-odds model (naive Bayes style). For features with a published
 * poor / non-poor split in EICV7 the weight is the log likelihood ratio of that split.
 * Features marked "assumed" have no published split (see data/synthetic/generation_report.json).
 * Because the synthetic training data is generated from these same tables, this mock is NOT
 * independent evidence of accuracy. Every response from it carries isMock = true.
 */
const clamp = (x: number, lo = -3, hi = 3) => Math.max(lo, Math.min(hi, x));
// ratio of percentage shares, floored at 0.1% so zero cells stay finite
const lr = (poor: number, non: number) => clamp(Math.log(Math.max(poor, 0.1) / Math.max(non, 0.1)));
const bin = (poorPct: number, nonPct: number, v: number) => {
  const a = poorPct / 100, b = nonPct / 100;
  return clamp(v ? Math.log(a / b) : Math.log((1 - a) / (1 - b)));
};

const PRIOR = Math.log(0.274 / (1 - 0.274)); // national poverty 27.4% (EICV7)

const EDU: Record<string, number> = {
  none_or_below_primary: lr(78.2, 53.4), primary: lr(19.3, 27.1), lower_secondary: lr(1.6, 4.9),
  upper_secondary: lr(0.9, 8.0), university: lr(0.0, 6.6),
};
const INCOME: Record<string, number> = {
  farm_wages: lr(32.5, 11.8), non_farm_wages: lr(18.9, 30.1), independent_farmer: lr(41.0, 41.2),
  independent_non_farmer: lr(7.0, 16.3), other: lr(0.6, 0.7),
};
const AGE: [number, number, number][] = [ // [upper bound, poor share, non-poor share], EICV7 Table 6.1
  [25, 2.5, 3.8], [35, 14.5, 21.5], [45, 34.9, 30.9], [55, 23.4, 19.4], [65, 14.7, 13.7], [200, 10.0, 10.7],
];
const UBUDEHE = [0, lr(12, 5), lr(38, 28), lr(47, 62), lr(3, 5)];   // ASSUMED shares
const INCOME_COUNT = [0, lr(55, 35), lr(35, 42), lr(10, 23)];        // ASSUMED shares

export function contributions(h: Household): Record<string, number> {
  const age = AGE.find((b) => h.head_age <= b[0]) ?? AGE[AGE.length - 1];
  return {
    has_mobile_money: bin(77.8, 90.3, h.has_mobile_money),
    has_savings: bin(53.2, 74.4, h.has_savings),
    has_electricity: bin(55.2, 77.1, h.has_electricity),
    improved_water: bin(85.0, 91.1, h.improved_water),
    has_credit: 0, // no published split by poverty status
    head_education_level: EDU[h.head_education_level],
    main_income_source: INCOME[h.main_income_source],
    head_age: lr(age[1], age[2]),
    ubudehe_category: UBUDEHE[h.ubudehe_category],                                  // assumed
    income_sources_count: INCOME_COUNT[Math.min(h.income_sources_count, 3)],        // assumed
    household_size: clamp(0.15 * (h.household_size - 4), -0.45, 0.75),             // assumed
    dependency_ratio: clamp(0.2 * (h.dependency_ratio - 1), -0.4, 0.8),             // assumed
    land_size_ha: clamp(-0.45 * Math.log((h.land_size_ha + 0.05) / 0.3), -0.8, 0.8), // assumed
    asset_index: clamp(3 * (0.38 - h.asset_index), -1.9, 1.1),                      // heuristic
    head_sex: 0,
  };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export class MockScorer implements Scorer {
  readonly isMock = true;
  async modelVersion() { return 'mock-0.1'; }

  async score(rows: Household[]): Promise<RawScore[]> {
    return rows.map((h) => {
      const c = contributions(h);
      const probability = sigmoid(PRIOR + Object.values(c).reduce((a, b) => a + b, 0));
      const value = (f: string) => (h as unknown as Record<string, number | string>)[f];
      const entries = Object.entries(c).filter(([f]) => isShownAsDriver(f));
      const make = (f: string, shap: number, direction: 'raises' | 'lowers'): RawDriver =>
        ({ feature: f, value: value(f), shap: Number(shap.toFixed(4)), direction });
      const raises = entries.filter(([, s]) => s > 0.02).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, s]) => make(f, s, 'raises'));
      const lowers = entries.filter(([, s]) => s < -0.02).sort((a, b) => a[1] - b[1]);
      return {
        id: h.household_id,
        probability,
        drivers: raises,
        protective: lowers.length ? make(lowers[0][0], lowers[0][1], 'lowers') : null,
      };
    });
  }
}