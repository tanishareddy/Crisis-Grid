/**
 * Crisis Grid — SMART CITY INFRASTRUCTURE DATA
 * Static asset definitions for Water, Gas, Communications, and Physical infrastructure
 * across 7 Bangalore zones.
 *
 * Asset ID pattern: {INFRA_PREFIX}_{TYPE}_{ZONE}_{NN}
 *   Water prefix:         WAT
 *   Gas prefix:           GAS
 *   Communications prefix: COM
 *   Physical prefix:      PHY
 */

// ─── Zone constants ───────────────────────────────────────────────────────────
export const ZONES = [
  "Whitefield",
  "Yelahanka",
  "Indiranagar",
  "Hebbal",
  "KR Puram",
  "Electronic City",
  "Peenya",
];

// ─── Zone centre coordinates (Bangalore) ─────────────────────────────────────
export const ZONE_COORDS = {
  Whitefield:       { lat: 12.9698, lng: 77.7500 },
  Yelahanka:        { lat: 13.1007, lng: 77.5963 },
  Indiranagar:      { lat: 12.9784, lng: 77.6408 },
  Hebbal:           { lat: 13.0358, lng: 77.5970 },
  "KR Puram":       { lat: 13.0050, lng: 77.6950 },
  "Electronic City":{ lat: 12.8399, lng: 77.6770 },
  Peenya:           { lat: 13.0280, lng: 77.5200 },
};

// ─── Infrastructure type colours ─────────────────────────────────────────────
export const INFRA_COLORS = {
  power:          "#3A86FF",
  water:          "#00E5FF",
  gas:            "#f59e0b",
  communications: "#a855f7",
  physical:       "#39FF14",
};

// ─── Fault / threshold definitions per infrastructure type ───────────────────
export const INFRA_THRESHOLDS = {
  water: {
    pressureBar:     { warning: 1.5,  direction: "below", label: "Pressure (bar)" },
    pumpHealthScore: { warning: 40,   direction: "below", label: "Pump Health Score" },
  },
  gas: {
    leakPpm:              { critical: 50,  direction: "above", label: "Leak (ppm)" },
    outletPressureDevPct: { warning:  0.20, direction: "above", label: "Outlet Pressure Deviation" },
  },
  communications: {
    uptimePct:      { warning: 95,       direction: "below",  label: "Uptime (%)" },
    backhaulStatus: { critical: "offline", direction: "equals", label: "Backhaul Status" },
  },
  physical: {
    structuralHealthScore: { warning: 50, critical: 25, direction: "below", label: "Structural Health Score" },
  },
};

// ─── Helper: small lat/lng jitter so assets don't stack on zone centre ────────
function jitter(base, range) {
  return parseFloat((base + (Math.random() * range * 2 - range)).toFixed(5));
}

// ─── Water Assets (WAT) ───────────────────────────────────────────────────────
// Types: PUMP (pump station), RES (reservoir), PIPE (pipeline segment)
const WATER_TYPES = ["PUMP", "RES", "PIPE"];

function makeWaterAssets(zone) {
  const c = ZONE_COORDS[zone];
  const zKey = zone.replace(/\s+/g, "_").toUpperCase();
  return WATER_TYPES.map((type, i) => ({
    assetId:         `WAT_${type}_${zKey}_0${i + 1}`,
    name:            `${zone} ${type === "PUMP" ? "Pump Station" : type === "RES" ? "Reservoir" : "Pipeline"} ${i + 1}`,
    shortName:       `${zone.split(" ")[0]} ${type}-${i + 1}`,
    infraType:       "water",
    zone,
    lat:             jitter(c.lat, 0.012),
    lng:             jitter(c.lng, 0.012),
    status:          "online",
    lastUpdated:     new Date().toISOString(),
    // initial sensor values (normal range)
    pressureBar:     parseFloat((2.5 + Math.random() * 4).toFixed(2)),
    flowLps:         parseFloat((20 + Math.random() * 60).toFixed(1)),
    leakDetected:    false,
    pumpHealthScore: Math.floor(60 + Math.random() * 35),
  }));
}

export const WATER_ASSETS = ZONES.flatMap(makeWaterAssets);

// ─── Gas Assets (GAS) ─────────────────────────────────────────────────────────
// Types: PIPE (pipeline segment), DIST (distribution station), VALVE (valve cluster)
const GAS_TYPES = ["PIPE", "DIST", "VALVE"];

function makeGasAssets(zone) {
  const c = ZONE_COORDS[zone];
  const zKey = zone.replace(/\s+/g, "_").toUpperCase();
  return GAS_TYPES.map((type, i) => {
    const nominal = parseFloat((3 + Math.random() * 3).toFixed(2));
    return {
      assetId:            `GAS_${type}_${zKey}_0${i + 1}`,
      name:               `${zone} ${type === "PIPE" ? "Pipeline Segment" : type === "DIST" ? "Distribution Station" : "Valve Cluster"} ${i + 1}`,
      shortName:          `${zone.split(" ")[0]} ${type}-${i + 1}`,
      infraType:          "gas",
      zone,
      lat:                jitter(c.lat, 0.012),
      lng:                jitter(c.lng, 0.012),
      status:             "online",
      lastUpdated:        new Date().toISOString(),
      inletPressureBar:   parseFloat((nominal + 1 + Math.random() * 3).toFixed(2)),
      outletPressureBar:  parseFloat((nominal * (0.9 + Math.random() * 0.15)).toFixed(2)),
      nominalPressureBar: nominal,
      flowM3h:            parseFloat((100 + Math.random() * 300).toFixed(1)),
      valveStatus:        "open",
      leakPpm:            parseFloat((Math.random() * 15).toFixed(1)),
    };
  });
}

export const GAS_ASSETS = ZONES.flatMap(makeGasAssets);

// ─── Communications Assets (COM) ─────────────────────────────────────────────
// Types: TOWER (cell tower), FIBRE (fibre node), EXCH (exchange point)
const COMMS_TYPES = ["TOWER", "FIBRE", "EXCH"];

function makeCommsAssets(zone) {
  const c = ZONE_COORDS[zone];
  const zKey = zone.replace(/\s+/g, "_").toUpperCase();
  return COMMS_TYPES.map((type, i) => ({
    assetId:           `COM_${type}_${zKey}_0${i + 1}`,
    name:              `${zone} ${type === "TOWER" ? "Cell Tower" : type === "FIBRE" ? "Fibre Node" : "Exchange Point"} ${i + 1}`,
    shortName:         `${zone.split(" ")[0]} ${type}-${i + 1}`,
    infraType:         "communications",
    zone,
    lat:               jitter(c.lat, 0.012),
    lng:               jitter(c.lng, 0.012),
    status:            "online",
    lastUpdated:       new Date().toISOString(),
    signalDbm:         parseFloat((-80 + Math.random() * 25).toFixed(1)),
    uptimePct:         parseFloat((96 + Math.random() * 3.5).toFixed(2)),
    activeConnections: Math.floor(50 + Math.random() * 400),
    backhaulStatus:    "online",
  }));
}

export const COMMS_ASSETS = ZONES.flatMap(makeCommsAssets);

// ─── Physical Assets (PHY) ────────────────────────────────────────────────────
// Types: BRIDGE, BLDG (building), ROAD (road segment)
const PHYSICAL_TYPES = ["BRIDGE", "BLDG", "ROAD"];

function makePhysicalAssets(zone) {
  const c = ZONE_COORDS[zone];
  const zKey = zone.replace(/\s+/g, "_").toUpperCase();
  return PHYSICAL_TYPES.map((type, i) => ({
    assetId:               `PHY_${type}_${zKey}_0${i + 1}`,
    name:                  `${zone} ${type === "BRIDGE" ? "Bridge" : type === "BLDG" ? "Building" : "Road Segment"} ${i + 1}`,
    shortName:             `${zone.split(" ")[0]} ${type}-${i + 1}`,
    infraType:             "physical",
    zone,
    lat:                   jitter(c.lat, 0.012),
    lng:                   jitter(c.lng, 0.012),
    status:                "online",
    lastUpdated:           new Date().toISOString(),
    structuralHealthScore: Math.floor(60 + Math.random() * 35),
    vibrationMms:          parseFloat((Math.random() * 2).toFixed(2)),
    tiltDegrees:           parseFloat((Math.random() * 1.5).toFixed(2)),
    lastInspectionDate:    new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000)
                             .toISOString().split("T")[0],
  }));
}

export const PHYSICAL_ASSETS = ZONES.flatMap(makePhysicalAssets);

// ─── Combined export ──────────────────────────────────────────────────────────
export const ALL_SMART_CITY_ASSETS = [
  ...WATER_ASSETS,
  ...GAS_ASSETS,
  ...COMMS_ASSETS,
  ...PHYSICAL_ASSETS,
];
