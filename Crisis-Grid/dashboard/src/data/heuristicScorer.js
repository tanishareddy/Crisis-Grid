/**
 * Crisis Grid — Heuristic Scorer
 * Computes a risk score [0, 1] and Risk_Level for any infrastructure asset.
 *
 * Formulas from design.md:
 *   Water, Gas, Comms, Physical — rule-based max() expressions
 *   Power — uses failure_probability from analyzeReading (mockData.js)
 *
 * Risk_Level thresholds:
 *   Low    < 0.35
 *   Medium 0.35 – 0.69
 *   High   ≥ 0.70
 */

/**
 * Returns "Low" | "Medium" | "High" for a given score in [0, 1].
 * @param {number} score
 * @returns {"Low"|"Medium"|"High"}
 */
export function getRiskLevel(score) {
  if (score >= 0.70) return "High";
  if (score >= 0.35) return "Medium";
  return "Low";
}

// ─── Per-type scorers ─────────────────────────────────────────────────────────

function scoreWater(reading) {
  const { leakDetected, pressureBar, pumpHealthScore } = reading;
  return Math.max(
    leakDetected ? 0.75 : 0,
    pressureBar < 1.5 ? 0.80 : 0,
    pumpHealthScore < 40 ? 0.72 : pumpHealthScore < 60 ? 0.45 : 0.10
  );
}

function scoreGas(reading) {
  const { leakPpm, outletPressureBar, nominalPressureBar } = reading;
  const pressureDev = Math.abs(outletPressureBar - nominalPressureBar) / nominalPressureBar;
  return Math.max(
    leakPpm > 50 ? 0.90 : leakPpm > 20 ? 0.55 : 0.10,
    pressureDev > 0.20 ? 0.70 : pressureDev > 0.10 ? 0.40 : 0.10
  );
}

function scoreComms(reading) {
  const { backhaulStatus, uptimePct } = reading;
  return Math.max(
    backhaulStatus === "offline" ? 0.85 : backhaulStatus === "degraded" ? 0.50 : 0.10,
    uptimePct < 95 ? 0.65 : uptimePct < 99 ? 0.30 : 0.05
  );
}

function scorePhysical(reading) {
  const { structuralHealthScore, vibrationMms } = reading;
  return Math.max(
    structuralHealthScore < 25 ? 0.90 : structuralHealthScore < 50 ? 0.65 : 0.15,
    vibrationMms > 5.0 ? 0.75 : vibrationMms > 2.5 ? 0.45 : 0.10
  );
}

function scorePower(reading) {
  // Power score comes directly from analyzeReading's failure_probability
  return typeof reading?.failure_probability === "number" ? reading.failure_probability : 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scores an asset based on its current sensor reading.
 *
 * @param {{ infraType: string }} asset
 * @param {object} reading  — SensorReading for the asset
 * @returns {{ score: number, riskLevel: "Low"|"Medium"|"High" }}
 */
export function scoreAsset(asset, reading) {
  if (!reading) return { score: 0, riskLevel: "Low" };

  let score = 0;
  switch (asset.infraType) {
    case "water":          score = scoreWater(reading);    break;
    case "gas":            score = scoreGas(reading);      break;
    case "communications": score = scoreComms(reading);    break;
    case "physical":       score = scorePhysical(reading); break;
    case "power":          score = scorePower(reading);    break;
    default:               score = 0;
  }

  return { score: parseFloat(score.toFixed(4)), riskLevel: getRiskLevel(score) };
}
