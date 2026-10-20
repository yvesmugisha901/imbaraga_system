export const REQUIRED_COLUMNS = [
  'household_id', 'district_code', 'household_size', 'dependency_ratio', 'head_age', 'head_sex',
  'head_education_level', 'ubudehe_category', 'main_income_source', 'income_sources_count',
  'land_size_ha', 'asset_index', 'has_electricity', 'improved_water', 'has_mobile_money',
  'has_savings', 'has_credit',
] as const;

export const EDUCATION_LEVELS = [
  'none_or_below_primary', 'primary', 'lower_secondary', 'upper_secondary', 'university',
] as const;
export const INCOME_SOURCES = [
  'farm_wages', 'non_farm_wages', 'independent_farmer', 'independent_non_farmer', 'other',
] as const;

export interface Household {
  household_id: string;
  district_code: string;
  household_size: number;
  dependency_ratio: number;
  head_age: number;
  head_sex: 'M' | 'F';
  head_education_level: (typeof EDUCATION_LEVELS)[number];
  ubudehe_category: number;
  main_income_source: (typeof INCOME_SOURCES)[number];
  income_sources_count: number;
  land_size_ha: number;
  asset_index: number;
  has_electricity: 0 | 1;
  improved_water: 0 | 1;
  has_mobile_money: 0 | 1;
  has_savings: 0 | 1;
  has_credit: 0 | 1;
}

export interface RowError { row: number; field: string; message: string }

type Spec =
  | { kind: 'int' | 'num'; min: number; max: number }
  | { kind: 'bool' }
  | { kind: 'enum'; values: readonly string[]; aliases?: Record<string, string> }
  | { kind: 'text'; max: number };

const SPEC: Record<(typeof REQUIRED_COLUMNS)[number], Spec> = {
  household_id: { kind: 'text', max: 50 },
  district_code: { kind: 'text', max: 60 },
  household_size: { kind: 'int', min: 1, max: 30 },
  dependency_ratio: { kind: 'num', min: 0, max: 20 },
  head_age: { kind: 'int', min: 15, max: 110 },
  head_sex: { kind: 'enum', values: ['M', 'F'], aliases: { male: 'M', female: 'F' } },
  head_education_level: { kind: 'enum', values: EDUCATION_LEVELS },
  ubudehe_category: { kind: 'int', min: 1, max: 4 },
  main_income_source: { kind: 'enum', values: INCOME_SOURCES },
  income_sources_count: { kind: 'int', min: 1, max: 10 },
  land_size_ha: { kind: 'num', min: 0, max: 100 },
  asset_index: { kind: 'num', min: 0, max: 1 },
  has_electricity: { kind: 'bool' },
  improved_water: { kind: 'bool' },
  has_mobile_money: { kind: 'bool' },
  has_savings: { kind: 'bool' },
  has_credit: { kind: 'bool' },
};

const TRUE = new Set(['1', 'true', 'yes', 'y']);
const FALSE = new Set(['0', 'false', 'no', 'n']);

function parseField(field: string, spec: Spec, raw: unknown): { value?: string | number; error?: string } {
  const text = raw === undefined || raw === null ? '' : String(raw).trim();
  if (text === '') return { error: `${field} is required` };
  switch (spec.kind) {
    case 'text':
      return text.length > spec.max ? { error: `${field} is too long (max ${spec.max} characters)` } : { value: text };
    case 'int':
    case 'num': {
      const n = Number(text);
      if (!Number.isFinite(n)) return { error: `${field} must be a number (got '${text}')` };
      if (spec.kind === 'int' && !Number.isInteger(n)) return { error: `${field} must be a whole number (got '${text}')` };
      if (n < spec.min || n > spec.max) return { error: `${field} must be between ${spec.min} and ${spec.max} (got ${text})` };
      return { value: n };
    }
    case 'bool': {
      const t = text.toLowerCase();
      if (TRUE.has(t)) return { value: 1 };
      if (FALSE.has(t)) return { value: 0 };
      return { error: `${field} must be 0 or 1 (got '${text}')` };
    }
    case 'enum': {
      const t = text.toLowerCase();
      const hit = spec.values.find((v) => v.toLowerCase() === t) ?? spec.aliases?.[t];
      return hit ? { value: hit } : { error: `${field} must be one of: ${spec.values.join(', ')} (got '${text}')` };
    }
  }
}

/** Row numbers follow the spreadsheet: pass firstRowNumber=2 for CSV (row 1 is the header). */
export function validateRows(
  rawRows: Record<string, unknown>[],
  opts: { firstRowNumber: number; knownDistricts: Set<string> },
): { rows: Household[]; errors: RowError[] } {
  const rows: Household[] = [];
  const errors: RowError[] = [];
  const seenIds = new Map<string, number>();

  rawRows.forEach((raw, i) => {
    const rowNo = opts.firstRowNumber + i;
    const out: Record<string, string | number> = {};
    let ok = true;
    for (const field of REQUIRED_COLUMNS) {
      const res = parseField(field, SPEC[field], raw[field]);
      if (res.error) { errors.push({ row: rowNo, field, message: res.error }); ok = false; }
      else out[field] = res.value as string | number;
    }
    if (ok) {
      const code = String(out.district_code);
      if (!opts.knownDistricts.has(code)) {
        errors.push({ row: rowNo, field: 'district_code', message: `district_code '${code}' is not one of the 30 districts` });
        ok = false;
      }
      const id = String(out.household_id);
      const first = seenIds.get(id);
      if (first !== undefined) {
        errors.push({ row: rowNo, field: 'household_id', message: `household_id '${id}' is duplicated (first used in row ${first})` });
        ok = false;
      } else seenIds.set(id, rowNo);
    }
    if (ok) rows.push(out as unknown as Household);
  });
  return { rows, errors };
}