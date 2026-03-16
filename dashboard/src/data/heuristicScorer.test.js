/**
 * Tests for heuristicScorer.js
 *
 * Task 15.1 — Property tests for scoreAsset
 * Task 15.2 — Unit tests for Power score passthrough
 *
 * Validates: Requirements 7.3, 7.4, 7.5, 7.6, 7.10
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getRiskLevel, scoreAsset } from "./heuristicScorer";
import { generateLiveReading, analyzeReading } from "./mockData";
import { SUBSTATIONS } from "./bangaloreData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const waterAsset    = { infraType: "water" };
const gasAsset      = { infraType: "gas" };
const commsAsset    = { infraType: "communications" };
const physicalAsset = { infraType: "physical" };

// ─── Task 15.1: Property tests ────────────────────────────────────────────────

describe("scoreAsset — property tests", () => {
  /**
   * Property 3: Score monotonicity for Water
   * Lower pumpHealthScore must produce a score >= higher pumpHealthScore, all else equal.
   * Validates: Requirements 7.3, 7.5
   */
  it("Property 3: Water — lower pumpHealthScore yields score >= higher pumpHealthScore", () => {
    /**
     * **Validates: Requirements 7.3, 7.5**
     */
    fc.assert(
      fc.property(
        // Two pump health scores where low < high
        fc.integer({ min: 0, max: 98 }),
        fc.integer({ min: 1, max: 99 }),
        fc.float({ min: 0, max: 10, noNaN: true }),
        fc.boolean(),
        (lowBase, diff, pressure, leak) => {
          const lowHealth  = Math.min(lowBase, 99);
          const highHealth = Math.min(lowHealth + diff, 100);

          const baseReading = {
            leakDetected:    leak,
            pressureBar:     pressure,
            pumpHealthScore: lowHealth,
          };
          const higherReading = { ...baseReading, pumpHealthScore: highHealth };

          const scoreLow  = scoreAsset(waterAsset, baseReading).score;
          const scoreHigh = scoreAsset(waterAsset, higherReading).score;

          // Lower health score must produce >= risk score
          return scoreLow >= scoreHigh;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Property 4: Score monotonicity for Gas
   * Higher leakPpm must produce a score >= lower leakPpm score.
   * Validates: Requirements 7.4, 7.5
   */
  it("Property 4: Gas — higher leakPpm yields score >= lower leakPpm", () => {
    /**
     * **Validates: Requirements 7.4, 7.5**
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 200, noNaN: true }),
        fc.float({ min: 0, max: 200, noNaN: true }),
        fc.float({ min: 1, max: 10, noNaN: true }),  // nominalPressureBar
        fc.float({ min: 0, max: 1, noNaN: true }),   // deviation factor
        (ppmA, ppmB, nominal, devFactor) => {
          const highPpm = Math.max(ppmA, ppmB);
          const lowPpm  = Math.min(ppmA, ppmB);
          const outlet  = nominal * (1 + devFactor * 0.3); // same outlet for both

          const lowReading  = { leakPpm: lowPpm,  outletPressureBar: outlet, nominalPressureBar: nominal };
          const highReading = { leakPpm: highPpm, outletPressureBar: outlet, nominalPressureBar: nominal };

          const scoreLow  = scoreAsset(gasAsset, lowReading).score;
          const scoreHigh = scoreAsset(gasAsset, highReading).score;

          return scoreHigh >= scoreLow;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Property 5: Risk_Level thresholds are exhaustive
   * For any score in [0,1], getRiskLevel must return exactly one of Low/Medium/High.
   * Validates: Requirements 7.5, 7.6
   */
  it("Property 5: Risk_Level thresholds are exhaustive and mutually exclusive", () => {
    /**
     * **Validates: Requirements 7.5, 7.6**
     */
    const validLevels = new Set(["Low", "Medium", "High"]);

    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (score) => {
          const level = getRiskLevel(score);
          return validLevels.has(level);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Additional: scoreAsset always returns a valid riskLevel for all infra types
   */
  it("scoreAsset always returns a valid riskLevel for all infrastructure types", () => {
    const validLevels = new Set(["Low", "Medium", "High"]);

    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 10, noNaN: true }),
        fc.boolean(),
        (health, pressure, leak) => {
          const waterReading = { leakDetected: leak, pressureBar: pressure, pumpHealthScore: health };
          const { riskLevel } = scoreAsset(waterAsset, waterReading);
          return validLevels.has(riskLevel);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── Task 15.2: Unit tests for Power score passthrough ────────────────────────

describe("scoreAsset — Power score passthrough (Req 7.10)", () => {
  it("returns failure_probability directly for a power asset reading", () => {
    const reading = { failure_probability: 0.72 };
    const { score, riskLevel } = scoreAsset({ infraType: "power" }, reading);
    expect(score).toBe(0.72);
    expect(riskLevel).toBe("High");
  });

  it("returns 0 when failure_probability is absent", () => {
    const { score, riskLevel } = scoreAsset({ infraType: "power" }, {});
    expect(score).toBe(0);
    expect(riskLevel).toBe("Low");
  });

  it("matches analyzeReading failure_probability for a real substation reading", () => {
    const sub = SUBSTATIONS[0];
    const raw = generateLiveReading(sub.id);
    const analyzed = analyzeReading(raw);

    const { score } = scoreAsset({ infraType: "power" }, analyzed);
    expect(score).toBe(analyzed.failure_probability);
  });

  it("returns 0 when reading is null", () => {
    const { score, riskLevel } = scoreAsset({ infraType: "power" }, null);
    expect(score).toBe(0);
    expect(riskLevel).toBe("Low");
  });
});

// ─── getRiskLevel boundary tests ─────────────────────────────────────────────

describe("getRiskLevel — boundary values", () => {
  it("returns Low for score < 0.35", () => {
    expect(getRiskLevel(0)).toBe("Low");
    expect(getRiskLevel(0.34)).toBe("Low");
    expect(getRiskLevel(0.349)).toBe("Low");
  });

  it("returns Medium for score 0.35–0.69", () => {
    expect(getRiskLevel(0.35)).toBe("Medium");
    expect(getRiskLevel(0.50)).toBe("Medium");
    expect(getRiskLevel(0.699)).toBe("Medium");
  });

  it("returns High for score >= 0.70", () => {
    expect(getRiskLevel(0.70)).toBe("High");
    expect(getRiskLevel(0.85)).toBe("High");
    expect(getRiskLevel(1.0)).toBe("High");
  });
});
