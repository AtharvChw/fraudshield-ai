import { describe, it, expect } from "vitest";
import { applyPlatt } from "./fraudModel";

describe("platt calibration", () => {
  it("matches the Python reference value (raw 0.63, A=8.9265, B=-7.4397)", () => {
    expect(applyPlatt(0.63, 8.9265, -7.4397)).toBeCloseTo(0.1399, 3);
  });
  it("is monotonic and bounded in [0,1]", () => {
    const a = 8.9265, b = -7.4397;
    let prev = -1;
    for (const p of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      const c = applyPlatt(p, a, b);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});
