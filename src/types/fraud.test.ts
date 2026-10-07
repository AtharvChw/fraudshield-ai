import { FEATURE_ORDER, riskBand } from "../types/fraud";
import { describe, it, expect } from "vitest";

describe("fraud contract", () => {
  it("feature order is immutable Time,V1..V28,Amount", () => {
    expect(FEATURE_ORDER[0]).toBe("Time");
    expect(FEATURE_ORDER[FEATURE_ORDER.length - 1]).toBe("Amount");
    expect(FEATURE_ORDER.length).toBe(30);
  });
  it("risk bands respect threshold", () => {
    expect(riskBand(0.01, 0.5)).toBe("Low");
    expect(riskBand(0.9, 0.5)).toBe("High");
  });
});
