/**
 * Crisis Grid — POWER INFRASTRUCTURE
 * Simulates live sensor readings from BESCOM substations
 * Mirrors columns from:
 *   - kaggle: smart-energy-meters-in-bangalore-india (consumption, voltage, current, pf, location)
 *   - kaggle: iot-enabled-smart-grid-dataset (voltage_v, current_a, frequency_hz, active_power_kw, fault_label)
 *   - kaggle: smart-grid-asset-monitoring-dataset (temperature_c, load_percent, health_score)
 */
import { SUBSTATIONS, POWER_FAULT_TYPES, REROUTE_PATHS } from "./bangaloreData";

export { SUBSTATIONS as ZONES, POWER_FAULT_TYPES };

// ─── Generate a live sensor reading for a substation ─────────────────────────
export function generateLiveReading(substationId, forceAnomaly = false) {
  const sub = SUBSTATIONS.find(s => s.id === substationId);
  const isHighVoltage = sub?.voltage_kv >= 110;

  const base = {
    substation_id: substationId,
    // Dataset 2 columns: iot-enabled-smart-grid-dataset
    voltage_v:           isHighVoltage ? 220 + Math.random() * 15 : 66 + Math.random() * 5,
    current_a:           40 + Math.random() * 20,
    frequency_hz:        49.8 + Math.random() * 0.4,
    active_power_kw:     (sub?.capacity_mva || 100) * 0.7 * 1000 * (0.85 + Math.random() * 0.1),
    reactive_power_kvar: 500 + Math.random() * 300,
    power_factor:        0.88 + Math.random() * 0.08,
    // Dataset 3 columns: smart-grid-asset-monitoring-dataset
    transformer_temp_c:  58 + Math.random() * 18,
    load_percent:        62 + Math.random() * 22,
    oil_level_pct:       88 + Math.random() * 10,
    health_score:        75 + Math.random() * 20,
    vibration_mm_s:      0.5 + Math.random() * 1.2,
    // Dataset 1 columns: smart-energy-meters-in-bangalore-india
    consumption_kwh:     (sub?.capacity_mva || 100) * 0.65 * (0.9 + Math.random() * 0.2),
    // meta
    fault_label:         0,
    fault_type:          "normal",
    timestamp:           new Date().toISOString(),
  };

  if (forceAnomaly) {
    const faults = POWER_FAULT_TYPES.filter(f => f.id !== "normal");
    const fault = faults[Math.floor(Math.random() * faults.length)];
    base.fault_type  = fault.id;
    base.fault_label = 1;

    switch (fault.id) {
      case "overload":             base.current_a *= 1.85; base.load_percent = 96 + Math.random() * 3; base.transformer_temp_c *= 1.3; break;
      case "short_circuit":        base.current_a *= 3.4;  base.voltage_v *= 0.28; base.health_score = 10 + Math.random() * 15; break;
      case "line_fault":           base.voltage_v *= 0.55; base.current_a *= 2.2;  base.health_score = 20 + Math.random() * 20; break;
      case "transformer_overheat": base.transformer_temp_c *= 1.85; base.oil_level_pct *= 0.7; base.health_score = 25 + Math.random() * 20; break;
      case "frequency_deviation":  base.frequency_hz += (Math.random() > 0.5 ? 4.5 : -4.5); break;
      case "voltage_sag":          base.voltage_v *= 0.72; base.power_factor -= 0.15; break;
      case "earth_fault":          base.current_a *= 1.6;  base.voltage_v *= 0.8; base.health_score = 30 + Math.random() * 20; break;
    }
    base._injectedFault = fault.id;
  }

  return base;
}

// ─── Analyse a reading and return full result with decision support ───────────
export function analyzeReading(reading) {
  const { voltage_v, current_a, frequency_hz, transformer_temp_c, load_percent, health_score, substation_id } = reading;
  const sub = SUBSTATIONS.find(s => s.id === substation_id);
  const nominalV = sub?.voltage_kv >= 110 ? 220 : 66;

  let faultType = "normal";
  let failureProb = 0.04 + Math.random() * 0.08;
  let isAnomaly = false;

  if (reading._injectedFault) {
    faultType = reading._injectedFault;
    failureProb = 0.68 + Math.random() * 0.30;
    isAnomaly = true;
  } else if (load_percent > 93)                        { faultType = "overload";             failureProb = 0.62 + Math.random() * 0.25; isAnomaly = true; }
  else if (voltage_v < nominalV * 0.65)                { faultType = "short_circuit";        failureProb = 0.85 + Math.random() * 0.14; isAnomaly = true; }
  else if (voltage_v < nominalV * 0.80)                { faultType = "line_fault";           failureProb = 0.70 + Math.random() * 0.20; isAnomaly = true; }
  else if (transformer_temp_c > 105)                   { faultType = "transformer_overheat"; failureProb = 0.68 + Math.random() * 0.22; isAnomaly = true; }
  else if (Math.abs(frequency_hz - 50) > 3)            { faultType = "frequency_deviation";  failureProb = 0.52 + Math.random() * 0.25; isAnomaly = true; }
  else if (voltage_v < nominalV * 0.88)                { faultType = "voltage_sag";          failureProb = 0.45 + Math.random() * 0.20; isAnomaly = true; }
  else if (health_score < 35)                          { faultType = "earth_fault";          failureProb = 0.58 + Math.random() * 0.25; isAnomaly = true; }

  let severity = "low";
  if (failureProb > 0.82) severity = "critical";
  else if (failureProb > 0.60) severity = "high";
  else if (failureProb > 0.35) severity = "medium";

  const rerouteTargets = REROUTE_PATHS[substation_id] || [];
  const rerouteNames = rerouteTargets.map(id => SUBSTATIONS.find(s => s.id === id)?.shortName || id).join(" → ");

  const DECISIONS = {
    short_circuit: {
      actions: [
        `IMMEDIATE: Isolate ${sub?.shortName} — circuit breaker trip initiated`,
        `POWER REROUTE: Transferring load to ${rerouteNames}`,
        "Deploy BESCOM emergency crew — ETA 12 minutes",
        "Activate UPS backup for NIMHANS, Bowring, Manipal hospitals",
        "Notify BBMP and KSRP for traffic management near fault site",
      ],
      emergency: true,
      recovery: "isolate_and_reroute",
      eta_min: 35,
    },
    overload: {
      actions: [
        `LOAD REDISTRIBUTION: Shift 35% load from ${sub?.shortName} to ${rerouteNames}`,
        "Activate demand response — alert industrial consumers in Peenya/Whitefield",
        "Reduce non-critical commercial load by 20%",
        `Schedule transformer inspection at ${sub?.name} within 2 hours`,
        "Issue advisory to BESCOM control room",
      ],
      emergency: false,
      recovery: "load_redistribution",
      eta_min: 12,
    },
    line_fault: {
      actions: [
        `SWITCHING: Activate alternate transmission path via ${rerouteNames}`,
        "Deploy BESCOM line inspection team",
        "Check for physical damage — storm/tree contact likely",
        "Monitor adjacent lines for cascade risk",
        "Update BESCOM outage management system",
      ],
      emergency: false,
      recovery: "line_switch",
      eta_min: 25,
    },
    transformer_overheat: {
      actions: [
        `COOLING: Activate forced cooling at ${sub?.name}`,
        `Reduce transformer load by 30% — reroute to ${rerouteNames}`,
        "Check oil level and cooling fans — dispatch maintenance",
        "Prepare standby transformer for hot switchover",
        "Log event in BESCOM asset management system",
      ],
      emergency: false,
      recovery: "cooling_activation",
      eta_min: 20,
    },
    frequency_deviation: {
      actions: [
        "FREQUENCY REGULATION: Activate automatic governor control",
        "Check generation-load balance across KPTCL grid",
        "Alert SLDC (State Load Dispatch Centre) Karnataka",
        "Monitor for cascade frequency collapse — 49.0 Hz threshold",
        "Coordinate with POSOCO for inter-state power exchange",
      ],
      emergency: false,
      recovery: "frequency_regulation",
      eta_min: 6,
    },
    voltage_sag: {
      actions: [
        "VOLTAGE CORRECTION: Tap changer adjustment on transformer",
        "Check reactive power compensation — capacitor banks",
        `Coordinate with ${rerouteNames} for voltage support`,
        "Alert sensitive industrial loads in area",
      ],
      emergency: false,
      recovery: "voltage_correction",
      eta_min: 8,
    },
    earth_fault: {
      actions: [
        "EARTH FAULT: Activate earth fault relay protection",
        "Isolate affected feeder — check insulation resistance",
        "Deploy ground fault locator team",
        `Backup supply from ${rerouteNames}`,
        "Safety alert — do not approach fault area",
      ],
      emergency: false,
      recovery: "earth_fault_isolation",
      eta_min: 30,
    },
    normal: {
      actions: [
        "All parameters within BESCOM operating limits",
        "Continue standard SCADA monitoring",
        "Next scheduled maintenance as per plan",
      ],
      emergency: false,
      recovery: null,
      eta_min: 0,
    },
  };

  const dec = DECISIONS[faultType] || DECISIONS.normal;
  const emergencyMode = dec.emergency && failureProb > 0.82;

  return {
    substation_id,
    zone: substation_id,
    substation_name: sub?.name || substation_id,
    is_anomaly: isAnomaly,
    fault_type: faultType,
    failure_probability: parseFloat(failureProb.toFixed(4)),
    severity,
    reroute_targets: rerouteTargets,
    decision_support: {
      actions: dec.actions,
      emergency_mode: emergencyMode,
      notification: isAnomaly
        ? `[POWER] ${severity.toUpperCase()}: ${faultType.replace(/_/g, " ")} at ${sub?.name} (${sub?.area})`
        : "",
      recovery_simulation: dec.recovery ? { type: dec.recovery, zone: substation_id, duration_min: dec.eta_min, reroute_to: rerouteTargets } : null,
      priority_zones: emergencyMode ? ["hospitals", "military_bases", "water_treatment", "residential"] : [],
      citizen_notification: isAnomaly
        ? `BESCOM Alert: Power disruption reported near ${sub?.area}. Crews dispatched. Estimated restoration: ${dec.eta_min} minutes.`
        : "",
    },
    sensor_readings: reading,
  };
}

// ─── Historical data generator ────────────────────────────────────────────────
export function generateHistoricalData(days = 14) {
  const data = [];
  const now = new Date();
  for (let i = days * 24; i >= 0; i--) {
    const t = new Date(now - i * 3600000);
    const isEvening = t.getHours() >= 18 && t.getHours() <= 22; // Bangalore peak hours
    data.push({
      time: t.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      hour: t.getHours(),
      transformer_temp: 60 + Math.random() * 18 + (isEvening ? 12 : 0),
      load: 62 + Math.random() * 22 + (isEvening ? 15 : 0),
      voltage: 218 + Math.random() * 12,
      frequency: 49.8 + Math.random() * 0.4,
      failures: Math.random() > 0.94 ? 1 : 0,
      consumption_kwh: 850 + Math.random() * 300 + (isEvening ? 200 : 0),
    });
  }
  return data;
}

// ─── Future risk predictions ──────────────────────────────────────────────────
export const FUTURE_RISK_ZONES = [
  { zone: "SUB_PEENYA",         risk: 0.81, reason: "Aging 1985 transformer, heavy industrial load from Peenya Industrial Area", eta: "36 hours" },
  { zone: "SUB_WHITEFIELD",     risk: 0.67, reason: "IT corridor peak demand — monsoon insulation degradation risk", eta: "72 hours" },
  { zone: "SUB_ELECTRONIC_CITY",risk: 0.58, reason: "Capacity near limit during evening peak (6–10 PM)", eta: "5 days" },
  { zone: "SUB_HEBBAL",         risk: 0.44, reason: "High-density residential growth exceeding planned capacity", eta: "7 days" },
];
