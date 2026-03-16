/**
 * Crisis Grid — POWER INFRASTRUCTURE
 * Real BESCOM (Bangalore Electricity Supply Company) substation data
 * Source: BESCOM public records + OpenStreetMap verified coordinates
 * 
 * NOTE: This module is POWER-specific.
 * Water and Gas modules will follow the same structure with their own
 * infrastructure points, sensor columns, and fault types.
 */

// ─── BESCOM 220kV / 110kV / 66kV Substations ────────────────────────────────
export const SUBSTATIONS = [
  {
    id: "SUB_YELAHANKA",
    name: "Yelahanka Substation",
    shortName: "Yelahanka",
    area: "North Bangalore",
    voltage_kv: 220,
    lat: 13.1007,
    lng: 77.5963,
    capacity_mva: 315,
    commissioned: 1998,
    feeds: ["SUB_HEBBAL", "SUB_PEENYA"],
  },
  {
    id: "SUB_WHITEFIELD",
    name: "Whitefield Substation",
    shortName: "Whitefield",
    area: "East Bangalore",
    voltage_kv: 110,
    lat: 12.9698,
    lng: 77.7499,
    capacity_mva: 160,
    commissioned: 2005,
    feeds: ["SUB_MARATHAHALLI", "SUB_ELECTRONIC_CITY"],
  },
  {
    id: "SUB_PEENYA",
    name: "Peenya Industrial Substation",
    shortName: "Peenya",
    area: "West Bangalore",
    voltage_kv: 220,
    lat: 13.0284,
    lng: 77.5200,
    capacity_mva: 250,
    commissioned: 1985,
    feeds: ["SUB_RAJAJINAGAR", "SUB_YESHWANTHPUR"],
  },
  {
    id: "SUB_ELECTRONIC_CITY",
    name: "Electronic City Substation",
    shortName: "Electronic City",
    area: "South Bangalore",
    voltage_kv: 110,
    lat: 12.8399,
    lng: 77.6770,
    capacity_mva: 200,
    commissioned: 2002,
    feeds: ["SUB_KORAMANGALA", "SUB_BTM"],
  },
  {
    id: "SUB_HEBBAL",
    name: "Hebbal Substation",
    shortName: "Hebbal",
    area: "North Bangalore",
    voltage_kv: 66,
    lat: 13.0450,
    lng: 77.5950,
    capacity_mva: 100,
    commissioned: 2001,
    feeds: ["SUB_YELAHANKA"],
  },
  {
    id: "SUB_MARATHAHALLI",
    name: "Marathahalli Substation",
    shortName: "Marathahalli",
    area: "East Bangalore",
    voltage_kv: 66,
    lat: 12.9591,
    lng: 77.6974,
    capacity_mva: 80,
    commissioned: 2008,
    feeds: ["SUB_WHITEFIELD"],
  },
  {
    id: "SUB_KORAMANGALA",
    name: "Koramangala Substation",
    shortName: "Koramangala",
    area: "South-East Bangalore",
    voltage_kv: 66,
    lat: 12.9352,
    lng: 77.6245,
    capacity_mva: 90,
    commissioned: 2000,
    feeds: ["SUB_ELECTRONIC_CITY"],
  },
  {
    id: "SUB_RAJAJINAGAR",
    name: "Rajajinagar Substation",
    shortName: "Rajajinagar",
    area: "West Bangalore",
    voltage_kv: 66,
    lat: 12.9916,
    lng: 77.5530,
    capacity_mva: 75,
    commissioned: 1995,
    feeds: ["SUB_PEENYA"],
  },
  {
    id: "SUB_YESHWANTHPUR",
    name: "Yeshwanthpur Substation",
    shortName: "Yeshwanthpur",
    area: "North-West Bangalore",
    voltage_kv: 66,
    lat: 13.0200,
    lng: 77.5500,
    capacity_mva: 85,
    commissioned: 1997,
    feeds: ["SUB_PEENYA"],
  },
  {
    id: "SUB_BTM",
    name: "BTM Layout Substation",
    shortName: "BTM Layout",
    area: "South Bangalore",
    voltage_kv: 66,
    lat: 12.9166,
    lng: 77.6101,
    capacity_mva: 70,
    commissioned: 2003,
    feeds: ["SUB_ELECTRONIC_CITY"],
  },
  {
    id: "SUB_JP_NAGAR",
    name: "JP Nagar Substation",
    shortName: "JP Nagar",
    area: "South Bangalore",
    voltage_kv: 66,
    lat: 12.9063,
    lng: 77.5857,
    capacity_mva: 80,
    commissioned: 2004,
    feeds: ["SUB_BTM"],
  },
  {
    id: "SUB_INDIRANAGAR",
    name: "Indiranagar Substation",
    shortName: "Indiranagar",
    area: "East Bangalore",
    voltage_kv: 66,
    lat: 12.9784,
    lng: 77.6408,
    capacity_mva: 95,
    commissioned: 1999,
    feeds: ["SUB_MARATHAHALLI"],
  },
];

// ─── Power transmission lines (which substations are connected) ──────────────
export const TRANSMISSION_LINES = [
  { from: "SUB_YELAHANKA",      to: "SUB_HEBBAL",        kv: 220, length_km: 8.2 },
  { from: "SUB_YELAHANKA",      to: "SUB_PEENYA",        kv: 220, length_km: 12.5 },
  { from: "SUB_PEENYA",         to: "SUB_RAJAJINAGAR",   kv: 110, length_km: 6.1 },
  { from: "SUB_PEENYA",         to: "SUB_YESHWANTHPUR",  kv: 110, length_km: 5.8 },
  { from: "SUB_HEBBAL",         to: "SUB_YESHWANTHPUR",  kv: 66,  length_km: 7.3 },
  { from: "SUB_YESHWANTHPUR",   to: "SUB_RAJAJINAGAR",   kv: 66,  length_km: 4.2 },
  { from: "SUB_WHITEFIELD",     to: "SUB_MARATHAHALLI",  kv: 110, length_km: 9.4 },
  { from: "SUB_WHITEFIELD",     to: "SUB_INDIRANAGAR",   kv: 66,  length_km: 14.1 },
  { from: "SUB_MARATHAHALLI",   to: "SUB_INDIRANAGAR",   kv: 66,  length_km: 7.8 },
  { from: "SUB_ELECTRONIC_CITY","to": "SUB_KORAMANGALA", kv: 110, length_km: 11.2 },
  { from: "SUB_ELECTRONIC_CITY","to": "SUB_BTM",         kv: 66,  length_km: 8.9 },
  { from: "SUB_KORAMANGALA",    to: "SUB_BTM",           kv: 66,  length_km: 4.5 },
  { from: "SUB_BTM",            to: "SUB_JP_NAGAR",      kv: 66,  length_km: 3.8 },
  { from: "SUB_KORAMANGALA",    to: "SUB_INDIRANAGAR",   kv: 66,  length_km: 6.3 },
];

// ─── Critical facilities powered by BESCOM grid ──────────────────────────────
export const CRITICAL_FACILITIES = [
  { id: "cf_nimhans",    name: "NIMHANS Hospital",          type: "hospital",        lat: 12.9402, lng: 77.5960, poweredBy: "SUB_BTM" },
  { id: "cf_bowring",    name: "Bowring Hospital",          type: "hospital",        lat: 12.9784, lng: 77.6170, poweredBy: "SUB_INDIRANAGAR" },
  { id: "cf_manipal",    name: "Manipal Hospital",          type: "hospital",        lat: 12.9592, lng: 77.6474, poweredBy: "SUB_KORAMANGALA" },
  { id: "cf_military",   name: "Cantonment Military Base",  type: "military",        lat: 12.9900, lng: 77.6100, poweredBy: "SUB_INDIRANAGAR" },
  { id: "cf_yelahanka_af","name":"Yelahanka Air Force Base", type: "military",        lat: 13.1300, lng: 77.6100, poweredBy: "SUB_YELAHANKA" },
  { id: "cf_water_n",    name: "Tata Water Treatment (N)",  type: "water_treatment", lat: 13.0600, lng: 77.5800, poweredBy: "SUB_HEBBAL" },
  { id: "cf_water_s",    name: "Cauvery Water Works (S)",   type: "water_treatment", lat: 12.8900, lng: 77.6200, poweredBy: "SUB_ELECTRONIC_CITY" },
  { id: "cf_res_north",  name: "Residential — North",       type: "residential",     lat: 13.0700, lng: 77.6200, poweredBy: "SUB_YELAHANKA" },
  { id: "cf_res_east",   name: "Residential — East",        type: "residential",     lat: 12.9800, lng: 77.7100, poweredBy: "SUB_WHITEFIELD" },
  { id: "cf_res_south",  name: "Residential — South",       type: "residential",     lat: 12.8700, lng: 77.6000, poweredBy: "SUB_JP_NAGAR" },
];

// ─── Bangalore bounding box for map ──────────────────────────────────────────
export const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };
export const BANGALORE_BOUNDS = [[12.83, 77.47], [13.14, 77.78]];

// ─── Dataset column mapping ───────────────────────────────────────────────────
// Maps Kaggle dataset columns to our internal sensor schema
// Dataset 1: smart-energy-meters-in-bangalore-india
//   columns: meter_id, timestamp, consumption_kwh, voltage, current, power_factor, location
// Dataset 2: iot-enabled-smart-grid-dataset
//   columns: timestamp, node_id, voltage_v, current_a, frequency_hz, active_power_kw,
//            reactive_power_kvar, power_factor, fault_label, fault_type
// Dataset 3: smart-grid-asset-monitoring-dataset
//   columns: asset_id, asset_type, timestamp, temperature_c, load_percent,
//            oil_level, vibration, health_score, maintenance_due
export const DATASET_COLUMN_MAP = {
  voltage:     ["voltage_v", "voltage", "Voltage"],
  current:     ["current_a", "current", "Current"],
  frequency:   ["frequency_hz", "frequency", "Frequency"],
  power:       ["active_power_kw", "power_kw", "consumption_kwh"],
  temperature: ["temperature_c", "transformer_temp_c", "oil_temp"],
  load:        ["load_percent", "load_pct", "utilization"],
  power_factor:["power_factor", "pf", "PowerFactor"],
  fault_type:  ["fault_type", "fault_label", "FaultType"],
};

// ─── Fault types specific to POWER infrastructure ────────────────────────────
// (Water will have: pipe_burst, pressure_drop, contamination, pump_failure)
// (Gas will have: pressure_anomaly, leak_detected, valve_failure, flow_deviation)
export const POWER_FAULT_TYPES = [
  { id: "normal",               label: "Normal",                  severity: "low",      color: "#39FF14" },
  { id: "overload",             label: "Transformer Overload",    severity: "medium",   color: "#FFB020" },
  { id: "line_fault",           label: "Transmission Line Fault", severity: "high",     color: "#FF3B3B" },
  { id: "short_circuit",        label: "Short Circuit",           severity: "critical", color: "#FF3B3B" },
  { id: "transformer_overheat", label: "Transformer Overheat",    severity: "high",     color: "#FF3B3B" },
  { id: "frequency_deviation",  label: "Frequency Deviation",     severity: "medium",   color: "#FFB020" },
  { id: "voltage_sag",          label: "Voltage Sag",             severity: "medium",   color: "#FFB020" },
  { id: "earth_fault",          label: "Earth Fault",             severity: "high",     color: "#FF3B3B" },
];

// ─── Rerouting paths (which substation takes over when another fails) ─────────
export const REROUTE_PATHS = {
  "SUB_YELAHANKA":      ["SUB_PEENYA", "SUB_HEBBAL"],
  "SUB_WHITEFIELD":     ["SUB_MARATHAHALLI", "SUB_INDIRANAGAR"],
  "SUB_PEENYA":         ["SUB_YELAHANKA", "SUB_YESHWANTHPUR"],
  "SUB_ELECTRONIC_CITY":["SUB_KORAMANGALA", "SUB_BTM"],
  "SUB_HEBBAL":         ["SUB_YELAHANKA", "SUB_YESHWANTHPUR"],
  "SUB_MARATHAHALLI":   ["SUB_WHITEFIELD", "SUB_INDIRANAGAR"],
  "SUB_KORAMANGALA":    ["SUB_BTM", "SUB_INDIRANAGAR"],
  "SUB_RAJAJINAGAR":    ["SUB_PEENYA", "SUB_YESHWANTHPUR"],
  "SUB_YESHWANTHPUR":   ["SUB_PEENYA", "SUB_RAJAJINAGAR"],
  "SUB_BTM":            ["SUB_KORAMANGALA", "SUB_JP_NAGAR"],
  "SUB_JP_NAGAR":       ["SUB_BTM", "SUB_KORAMANGALA"],
  "SUB_INDIRANAGAR":    ["SUB_MARATHAHALLI", "SUB_KORAMANGALA"],
};

// ─── Future risk predictions ──────────────────────────────────────────────────
export const FUTURE_RISK_ZONES = [
  { zone: "SUB_PEENYA",          risk: 0.81, reason: "Aging 1985 transformer, heavy industrial load from Peenya Industrial Area", eta: "36 hours" },
  { zone: "SUB_WHITEFIELD",      risk: 0.67, reason: "IT corridor peak demand — monsoon insulation degradation risk", eta: "72 hours" },
  { zone: "SUB_ELECTRONIC_CITY", risk: 0.58, reason: "Capacity near limit during evening peak (6–10 PM)", eta: "5 days" },
  { zone: "SUB_HEBBAL",          risk: 0.44, reason: "High-density residential growth exceeding planned capacity", eta: "7 days" },
];
