import { FEATURE_ORDER } from "../types/fraud";

export const REQUIRED_COLUMNS = FEATURE_ORDER;

export interface CsvValidation {
  ok: boolean;
  missing: string[];
  rowCount: number;
  malformedRows: number;
}

/** Validate parsed CSV headers + count malformed (non-numeric) rows. */
export function validateCsv(headers: string[], rows: Record<string, unknown>[]): CsvValidation {
  const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
  let malformed = 0;
  for (const r of rows) {
    for (const c of REQUIRED_COLUMNS) {
      const v = r[c];
      if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) {
        malformed++;
        break;
      }
    }
  }
  return { ok: missing.length === 0, missing, rowCount: rows.length, malformedRows: malformed };
}
