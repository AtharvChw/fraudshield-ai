import { describe, it, expect } from "vitest";
import { validateCsv, REQUIRED_COLUMNS } from "./csv";

const goodHeaders = [...REQUIRED_COLUMNS];
const goodRows = [
  Object.fromEntries(REQUIRED_COLUMNS.map(c => [c, "0.5"])),
  Object.fromEntries(REQUIRED_COLUMNS.map(c => [c, "-1.2"])),
];

describe("csv validation", () => {
  it("accepts a well-formed header + rows", () => {
    const v = validateCsv(goodHeaders, goodRows);
    expect(v.ok).toBe(true);
    expect(v.rowCount).toBe(2);
    expect(v.malformedRows).toBe(0);
  });
  it("rejects missing columns and names them", () => {
    const v = validateCsv(["Time", "Amount"], goodRows);
    expect(v.ok).toBe(false);
    expect(v.missing).toContain("V1");
    expect(v.missing).toContain("V28");
  });
  it("counts malformed (non-numeric) rows without rejecting", () => {
    const rows = [...goodRows, { ...goodRows[0], V3: "abc" }, { ...goodRows[0], Amount: "" }];
    const v = validateCsv(goodHeaders, rows);
    expect(v.ok).toBe(true);
    expect(v.malformedRows).toBe(2);
  });
  it("flags an empty file", () => {
    const v = validateCsv(goodHeaders, []);
    expect(v.rowCount).toBe(0);
  });
});
