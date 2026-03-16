/**
 * Crisis Grid — SMART CITY SENSOR GENERATORS
 * Client-side simulation of live sensor readings for Water, Gas,
 * Communications, and Physical infrastructure assets.
 *
 * Each generator accepts (assetId, forceAnomaly = false).
 * When forceAnomaly = true the returned reading breaches the thresholds
 * defined in Requirements 11.5–11.8.
 *
 * Normal operating ranges:
 *   Water:  pressure 1.5–8 bar, flow 10–100 L/s, pumpHealth 40–100
 *   Gas:    inlet 2–10 bar, outlet 1.5–8 bar, flow 50–500 m³/h, leak 0–20 ppm
 *   Comms:  signal -90 to -50 dBm, uptime 95–100 %, connections 10–500
 *   Physical: health 50–100, vibration 0–2.5 mm/s, tilt 0–2 degrees
 */

import { WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS } from "./smartCityData";

// ─── Utility ──────────────────────────────────────────────────────────────────
function rand(min, max) {
  return parseFloat((min + Math.random() * (max - min)).toFixed(3));
}
function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// ─── Water Reading Generator ──────────────────────────────────────────────────
/**
 * generateWaterReading(assetId, forceAnomaly)
 * Req 11.1 — realistic randomised values for all Water Asset sensor fields
 * Req 11.5 — forceAnomaly=true → pressureBar < 1.5 OR pumpHealthScore < 40
 */
export function generateWaterReading(assetId, forceAnomaly = false) {
  const asset = WATER_ASSETS.find(a => a.assetId === assetId);

  let pressureBar, pumpHealthScore, flowLps, leakDetected;

  if (forceAnomaly) {
    // Randomly pick which threshold to breach (or both)
    const breachPressure = Math.random() > 0.5;
    pressureBar      = breachPressure ? rand(0.2, 1.49) : rand(1.5, 8.0);
    pumpHealthScore  = (!breachPressure || Math.random() > 0.6)
                         ? randInt(5, 39)
                         : randInt(40, 100);
    flowLps          = rand(2, 9);          // low flow accompanies anomaly
    leakDetected     = pressureBar < 1.5;
  } else {
    pressureBar      = rand(1.5, 8.0);
    pumpHealthScore  = randInt(40, 100);
    flowLps          = rand(10, 100);
    leakDetected     = false;
  }

  return {
    assetId,
    pressureBar:     parseFloat(pressureBar.toFixed(2)),
    flowLps:         parseFloat(flowLps.toFixed(1)),
    leakDetected,
    pumpHealthScore,
    status:          leakDetected || pressureBar < 1.5 ? "warning"
                       : pumpHealthScore < 40 ? "warning" : "online",
    timestamp:       new Date().toISOString(),
    ...(asset ? { zone: asset.zone, infraType: asset.infraType } : {}),
  };
}

// ─── Gas Reading Generator ────────────────────────────────────────────────────
/**
 * generateGasReading(assetId, forceAnomaly)
 * Req 11.2 — realistic randomised values for all Gas Asset sensor fields
 * Req 11.6 — forceAnomaly=true → leakPpm > 50 OR outlet pressure deviation > 20%
 */
export function generateGasReading(assetId, forceAnomaly = false) {
  const asset = GAS_ASSETS.find(a => a.assetId === assetId);
  const nominal = asset?.nominalPressureBar ?? rand(3, 6);

  let inletPressureBar, outletPressureBar, flowM3h, valveStatus, leakPpm;

  if (forceAnomaly) {
    const breachLeak = Math.random() > 0.5;
    leakPpm = breachLeak ? rand(51, 200) : rand(0, 20);

    if (!breachLeak || Math.random() > 0.5) {
      // Breach outlet pressure deviation > 20%
      const deviation = rand(0.21, 0.50);
      const sign = Math.random() > 0.5 ? 1 : -1;
      outletPressureBar = parseFloat((nominal * (1 + sign * deviation)).toFixed(2));
    } else {
      outletPressureBar = parseFloat((nominal * (0.9 + Math.random() * 0.15)).toFixed(2));
    }

    inletPressureBar = parseFloat((outletPressureBar + rand(0.5, 2)).toFixed(2));
    flowM3h          = rand(10, 50);   // reduced flow during anomaly
    valveStatus      = Math.random() > 0.7 ? "partial" : "open";
  } else {
    inletPressureBar  = parseFloat((nominal + rand(1, 4)).toFixed(2));
    outletPressureBar = parseFloat((nominal * (0.9 + Math.random() * 0.15)).toFixed(2));
    flowM3h           = rand(50, 500);
    valveStatus       = "open";
    leakPpm           = rand(0, 20);
  }

  const dev = Math.abs(outletPressureBar - nominal) / nominal;
  const status = leakPpm > 50 ? "critical"
               : dev > 0.20   ? "warning"
               : "online";

  return {
    assetId,
    inletPressureBar:  parseFloat(inletPressureBar.toFixed(2)),
    outletPressureBar: parseFloat(outletPressureBar.toFixed(2)),
    nominalPressureBar: parseFloat(nominal.toFixed(2)),
    flowM3h:           parseFloat(flowM3h.toFixed(1)),
    valveStatus,
    leakPpm:           parseFloat(leakPpm.toFixed(1)),
    status,
    timestamp:         new Date().toISOString(),
    ...(asset ? { zone: asset.zone, infraType: asset.infraType } : {}),
  };
}

// ─── Communications Reading Generator ────────────────────────────────────────
/**
 * generateCommsReading(assetId, forceAnomaly)
 * Req 11.3 — realistic randomised values for all Communications Asset sensor fields
 * Req 11.7 — forceAnomaly=true → uptimePct < 95 OR backhaulStatus === "offline"
 */
export function generateCommsReading(assetId, forceAnomaly = false) {
  const asset = COMMS_ASSETS.find(a => a.assetId === assetId);

  let signalDbm, uptimePct, activeConnections, backhaulStatus;

  if (forceAnomaly) {
    const breachUptime = Math.random() > 0.5;
    uptimePct       = breachUptime ? rand(60, 94.9) : rand(95, 100);
    backhaulStatus  = (!breachUptime || Math.random() > 0.5) ? "offline" : "degraded";
    signalDbm       = rand(-90, -70);   // degraded signal during anomaly
    activeConnections = randInt(0, 30);
  } else {
    signalDbm         = rand(-90, -50);
    uptimePct         = rand(95, 100);
    activeConnections = randInt(10, 500);
    backhaulStatus    = Math.random() > 0.05 ? "online" : "degraded";
  }

  const status = backhaulStatus === "offline" ? "critical"
               : uptimePct < 95              ? "warning"
               : backhaulStatus === "degraded" ? "warning"
               : "online";

  return {
    assetId,
    signalDbm:         parseFloat(signalDbm.toFixed(1)),
    uptimePct:         parseFloat(uptimePct.toFixed(2)),
    activeConnections,
    backhaulStatus,
    status,
    timestamp:         new Date().toISOString(),
    ...(asset ? { zone: asset.zone, infraType: asset.infraType } : {}),
  };
}

// ─── Physical Reading Generator ───────────────────────────────────────────────
/**
 * generatePhysicalReading(assetId, forceAnomaly)
 * Req 11.4 — realistic randomised values for all Physical Asset sensor fields
 * Req 11.8 — forceAnomaly=true → structuralHealthScore < 50
 */
export function generatePhysicalReading(assetId, forceAnomaly = false) {
  const asset = PHYSICAL_ASSETS.find(a => a.assetId === assetId);

  let structuralHealthScore, vibrationMms, tiltDegrees;

  if (forceAnomaly) {
    structuralHealthScore = randInt(5, 49);
    vibrationMms          = rand(2.5, 8.0);   // elevated vibration with structural issues
    tiltDegrees           = rand(1.5, 5.0);
  } else {
    structuralHealthScore = randInt(50, 100);
    vibrationMms          = rand(0, 2.5);
    tiltDegrees           = rand(0, 2.0);
  }

  const status = structuralHealthScore < 25 ? "critical"
               : structuralHealthScore < 50 ? "warning"
               : "online";

  return {
    assetId,
    structuralHealthScore,
    vibrationMms:       parseFloat(vibrationMms.toFixed(2)),
    tiltDegrees:        parseFloat(tiltDegrees.toFixed(2)),
    lastInspectionDate: asset?.lastInspectionDate
                          ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    status,
    timestamp:          new Date().toISOString(),
    ...(asset ? { zone: asset.zone, infraType: asset.infraType } : {}),
  };
}
