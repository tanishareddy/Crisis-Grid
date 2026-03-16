/**
 * simulateFault.js — Multi-Infrastructure Fault Simulator
 *
 * Generates random faults across Water, Gas, Communications, and Physical infra.
 * Called by App.jsx when the user clicks "Simulate Fault".
 *
 * Exports:
 *  - simulateMultiFault()  → Fault[]   — generates 1–2 random non-power faults
 *  - faultToIncident(fault) → Incident  — converts a Fault into an Incident record
 */

import { SUBSTATIONS } from "./bangaloreData";
import { WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS } from "./smartCityData";

// Unused directly but kept for reference — severity levels in order
const SEVERITIES = ["low", "medium", "high", "critical"];

/** Pick a random element from an array */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Weighted random severity:
 *  low 20% | medium 35% | high 30% | critical 15%
 * Skewed toward high/critical to make simulations feel impactful.
 */
function randomSeverity() {
  const r = Math.random();
  if (r < 0.20) return "low";
  if (r < 0.55) return "medium";
  if (r < 0.85) return "high";
  return "critical";
}

/**
 * Map severity level to a numeric risk score (0–100).
 * Used to populate the incident's failure_probability field.
 */
function riskScore(severity) {
  return { low: 15, medium: 40, high: 70, critical: 95 }[severity];
}

// ── Fault templates per infrastructure type ───────────────────────────────────
// Each entry has a faultType key and a description factory function.
// The description receives the asset object so it can include the asset name.

const FAULT_TEMPLATES = {
  water: [
    { faultType: "water_leak",         description: (a) => `Active water leak detected at ${a.name}. Pressure dropped to critical levels.` },
    { faultType: "low_pressure",       description: (a) => `Low pressure alert at ${a.name}. Network pressure below 1.5 bar threshold.` },
    { faultType: "pump_failure",       description: (a) => `Pump failure at ${a.name}. Pump health score critically degraded.` },
    { faultType: "reservoir_overflow", description: (a) => `Reservoir overflow warning at ${a.name}. Tank level exceeding safe capacity.` },
  ],
  gas: [
    { faultType: "gas_leak",           description: (a) => `Gas leak detected at ${a.name}. Concentration exceeds 50 ppm safety threshold.` },
    { faultType: "pressure_drop",      description: (a) => `Pressure drop at ${a.name}. Outlet pressure deviation > 20% from nominal.` },
    { faultType: "pipeline_blockage",  description: (a) => `Pipeline blockage suspected at ${a.name}. Flow rate significantly reduced.` },
    { faultType: "valve_malfunction",  description: (a) => `Valve malfunction at ${a.name}. Valve stuck in partial-open position.` },
  ],
  communications: [
    { faultType: "tower_offline",      description: (a) => `Cell tower offline at ${a.name}. Backhaul connection lost.` },
    { faultType: "signal_degradation", description: (a) => `Signal degradation at ${a.name}. Signal strength below -80 dBm.` },
    { faultType: "backhaul_failure",   description: (a) => `Backhaul failure at ${a.name}. Network uptime dropped below 95%.` },
    { faultType: "network_congestion", description: (a) => `Network congestion at ${a.name}. Active connections near capacity.` },
  ],
  physical: [
    { faultType: "structural_stress",  description: (a) => `Structural stress warning at ${a.name}. Health score below safe threshold.` },
    { faultType: "excess_load",        description: (a) => `Excess load detected at ${a.name}. Load exceeding design specifications.` },
    { faultType: "vibration_anomaly",  description: (a) => `Vibration anomaly at ${a.name}. Vibration levels above 2.5 mm/s.` },
    { faultType: "inspection_overdue", description: (a) => `Inspection overdue at ${a.name}. Last inspection exceeded 180-day limit.` },
  ],
};

// Maps each infra type string to its corresponding asset array
const ASSET_POOLS = {
  water:          WATER_ASSETS,
  gas:            GAS_ASSETS,
  communications: COMMS_ASSETS,
  physical:       PHYSICAL_ASSETS,
};

// ── Generate a single fault for a given infrastructure type ───────────────────

/**
 * generateInfraFault — picks a random asset and fault template for the given
 * infrastructure type, assigns a weighted random severity, and returns a
 * fully-formed Fault object.
 *
 * @param {string} infraType - "water" | "gas" | "communications" | "physical"
 * @returns {Fault}
 */

function generateInfraFault(infraType) {
  const assets = ASSET_POOLS[infraType];
  const asset = pickRandom(assets);
  const template = pickRandom(FAULT_TEMPLATES[infraType]);
  const severity = randomSeverity();

  return {
    id: `FAULT-${infraType.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    infrastructureType: infraType,
    assetId: asset.assetId,
    assetName: asset.name,
    location: asset.zone,
    faultType: template.faultType,
    severity,
    description: template.description(asset),
    timestamp: new Date().toISOString(),
    riskScore: riskScore(severity),
    status: "open",
    isNew: true,
  };
}

// ── Main export: simulate 1–2 random non-power faults ────────────────────────

/**
 * simulateMultiFault — called when the user clicks "Simulate Fault".
 * Picks 1–2 non-power infrastructure types at random (no duplicates)
 * and generates one fault per chosen type.
 *
 * @returns {Fault[]} Array of 1–2 fault objects
 */

export function simulateMultiFault() {
  const NON_POWER_TYPES = ["water", "gas", "communications", "physical"];

  // Pick 1–2 non-power infra types at random (no duplicates)
  const shuffled = [...NON_POWER_TYPES].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 2) + 1; // 1 or 2
  const chosen = shuffled.slice(0, count);

  return chosen.map(generateInfraFault);
}

// ── Convert a simulated fault into an incident record ─────────────────────────

/**
 * faultToIncident — maps a Fault object to the Incident schema used by
 * the Incidents page and the incident log in App.jsx state.
 *
 * @param {Fault} fault
 * @returns {Incident}
 */

export function faultToIncident(fault) {
  return {
    id: `INC-${fault.id}`,
    title: `${fault.faultType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} — ${fault.assetName}`,
    type: fault.faultType,
    infraType: fault.infrastructureType,
    substation: fault.assetId,
    location: fault.location,
    severity: fault.severity,
    description: fault.description,
    reporter: "System (Fault Simulator)",
    contact: "Crisis Grid Control Room",
    timestamp: fault.timestamp,
    status: "open",
    isNew: true,
    fault_type: fault.faultType,
    failure_probability: fault.riskScore / 100,
  };
}
