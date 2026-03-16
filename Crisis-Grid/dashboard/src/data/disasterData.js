/**
 * Disaster Mode — reference data
 * Regions, disaster types, evacuation routes, shelters, hospitals, resources
 * All coordinates are real Bangalore locations
 */

// ─── Bangalore regions (selectable on map) ───────────────────────────────────
export const BANGALORE_REGIONS = [
  { id: "north",    name: "North Bangalore",      lat: 13.0700, lng: 77.5900, color: "#3A86FF" },
  { id: "south",    name: "South Bangalore",      lat: 12.8900, lng: 77.6100, color: "#39FF14" },
  { id: "east",     name: "East Bangalore",       lat: 12.9700, lng: 77.7200, color: "#FFB020" },
  { id: "west",     name: "West Bangalore",       lat: 13.0100, lng: 77.5100, color: "#FF6B35" },
  { id: "central",  name: "Central Bangalore",    lat: 12.9716, lng: 77.5946, color: "#8B5CF6" },
  { id: "peenya",   name: "Peenya Industrial",    lat: 13.0284, lng: 77.5200, color: "#FF3B3B" },
  { id: "whitefield",name:"Whitefield / IT Corridor",lat:12.9698,lng:77.7499,color:"#00E5FF" },
  { id: "koramangala",name:"Koramangala",         lat: 12.9352, lng: 77.6245, color: "#FF8C00" },
];

// ─── Disaster types (shown AFTER region selection) ───────────────────────────
export const EMERGENCY_TYPES = [
  { id: "flood",      label: "Flood",          icon: "🌊", color: "#3A86FF",
    description: "Flash flooding from heavy rainfall or lake overflow" },
  { id: "fire",       label: "Fire",           icon: "🔥", color: "#FF6B35",
    description: "Industrial or residential fire outbreak" },
  { id: "earthquake", label: "Earthquake",     icon: "🌍", color: "#8B5CF6",
    description: "Seismic activity causing structural damage" },
  { id: "blackout",   label: "Blackout",       icon: "⚡", color: "#FFB020",
    description: "Large-scale power grid failure" },
  { id: "chemical",   label: "Chemical Leak",  icon: "☣",  color: "#39FF14",
    description: "Hazardous material release from industrial zone" },
];

// ─── Per-region, per-disaster affected zones ─────────────────────────────────
// Each entry: { regionId, disasterType, zones[], predictedZones[], routes[], hospitals[], resources }
export const DISASTER_SCENARIOS = {
  // NORTH + FLOOD
  "north_flood": {
    affectedZones: [
      { id: "az1", name: "Hebbal Lake Overflow",   lat: 13.0450, lng: 77.5950, severity: "critical", radius: 1400, population: 52000, density: "High" },
      { id: "az2", name: "Yelahanka Low-lying",    lat: 13.1007, lng: 77.5963, severity: "high",     radius: 1000, population: 31000, density: "Medium" },
      { id: "az3", name: "Jakkur Aerodrome Area",  lat: 13.0800, lng: 77.6100, severity: "medium",   radius: 800,  population: 18000, density: "Low" },
    ],
    predictedZones: [
      { id: "p1", name: "Thanisandra (next)",      lat: 13.0600, lng: 77.6200, risk: 0.82, eta: "~1.5 hrs", reason: "Downstream drainage overflow", population: 28000 },
      { id: "p2", name: "Kogilu Cross (next)",     lat: 13.0900, lng: 77.6000, risk: 0.64, eta: "~3 hrs",   reason: "Stormwater channel capacity", population: 14000 },
      { id: "p3", name: "Devanahalli Road (next)", lat: 13.1200, lng: 77.6100, risk: 0.41, eta: "~5 hrs",   reason: "Elevated risk from upstream", population: 9000  },
    ],
    routes: [
      { id: "r1", name: "NH44 North Corridor",     color: "#00E5FF", eta: "22 min", status: "clear",
        waypoints: [[13.0450,77.5950],[13.0700,77.5700],[13.1007,77.5963],[13.1300,77.5900]] },
      { id: "r2", name: "Bellary Road Alternate",  color: "#39FF14", eta: "35 min", status: "clear",
        waypoints: [[13.0450,77.5950],[13.0600,77.6100],[13.0900,77.6200],[13.1200,77.6300]] },
    ],
    hospitals: [
      { id: "h1", name: "Columbia Asia Hebbal",    lat: 13.0350, lng: 77.5900, beds: 120, distance: "1.2 km" },
      { id: "h2", name: "Aster CMI Hospital",      lat: 13.0300, lng: 77.5800, beds: 200, distance: "2.8 km" },
      { id: "h3", name: "Manipal North",           lat: 13.0100, lng: 77.5700, beds: 80,  distance: "4.1 km" },
    ],
    resources: { teams: 8, ambulances: 12, boats: 6, shelterCapacity: 14000, reliefKits: 3200 },
  },

  // PEENYA + FIRE
  "peenya_fire": {
    affectedZones: [
      { id: "az1", name: "Peenya Phase 1",         lat: 13.0284, lng: 77.5200, severity: "critical", radius: 1200, population: 45000, density: "Very High" },
      { id: "az2", name: "Peenya Phase 2",         lat: 13.0350, lng: 77.5100, severity: "high",     radius: 900,  population: 22000, density: "High" },
      { id: "az3", name: "Yeshwanthpur Junction",  lat: 13.0200, lng: 77.5500, severity: "medium",   radius: 700,  population: 16000, density: "Medium" },
    ],
    predictedZones: [
      { id: "p1", name: "Rajajinagar (next)",      lat: 12.9916, lng: 77.5530, risk: 0.75, eta: "~45 min", reason: "Wind direction + chemical storage", population: 38000 },
      { id: "p2", name: "Jalahalli (next)",        lat: 13.0500, lng: 77.5400, risk: 0.58, eta: "~2 hrs",  reason: "Adjacent industrial units",        population: 21000 },
    ],
    routes: [
      { id: "r1", name: "Tumkur Road West",        color: "#FF6B35", eta: "18 min", status: "clear",
        waypoints: [[13.0284,77.5200],[13.0400,77.5000],[13.0600,77.4800],[13.0800,77.4600]] },
      { id: "r2", name: "Ring Road South Exit",    color: "#FFB020", eta: "28 min", status: "partial",
        waypoints: [[13.0284,77.5200],[13.0100,77.5300],[12.9900,77.5400],[12.9700,77.5500]] },
    ],
    hospitals: [
      { id: "h1", name: "Rajajinagar General",     lat: 12.9916, lng: 77.5530, beds: 90,  distance: "3.5 km" },
      { id: "h2", name: "BGS Global Hospital",     lat: 12.9700, lng: 77.5500, beds: 150, distance: "5.2 km" },
    ],
    resources: { teams: 12, ambulances: 8, boats: 0, shelterCapacity: 9000, reliefKits: 1800 },
  },

  // CENTRAL + EARTHQUAKE
  "central_earthquake": {
    affectedZones: [
      { id: "az1", name: "MG Road / Brigade",      lat: 12.9716, lng: 77.6100, severity: "critical", radius: 1100, population: 68000, density: "Very High" },
      { id: "az2", name: "Shivajinagar",           lat: 12.9850, lng: 77.6000, severity: "high",     radius: 900,  population: 42000, density: "High" },
      { id: "az3", name: "Cubbon Park Area",       lat: 12.9763, lng: 77.5929, severity: "medium",   radius: 700,  population: 25000, density: "Medium" },
    ],
    predictedZones: [
      { id: "p1", name: "Indiranagar (next)",      lat: 12.9784, lng: 77.6408, risk: 0.71, eta: "~30 min", reason: "Aftershock propagation east",  population: 55000 },
      { id: "p2", name: "Koramangala (next)",      lat: 12.9352, lng: 77.6245, risk: 0.55, eta: "~1 hr",   reason: "Structural cascade risk",      population: 48000 },
      { id: "p3", name: "Jayanagar (next)",        lat: 12.9250, lng: 77.5938, risk: 0.38, eta: "~2 hrs",  reason: "Older building stock",         population: 35000 },
    ],
    routes: [
      { id: "r1", name: "Outer Ring Road East",    color: "#8B5CF6", eta: "25 min", status: "clear",
        waypoints: [[12.9716,77.6100],[12.9800,77.6500],[12.9900,77.7000],[13.0000,77.7400]] },
      { id: "r2", name: "Hosur Road South",        color: "#00E5FF", eta: "30 min", status: "clear",
        waypoints: [[12.9716,77.6100],[12.9400,77.6200],[12.9000,77.6400],[12.8600,77.6600]] },
      { id: "r3", name: "Tumkur Road West",        color: "#39FF14", eta: "20 min", status: "clear",
        waypoints: [[12.9716,77.5946],[13.0000,77.5400],[13.0284,77.5200]] },
    ],
    hospitals: [
      { id: "h1", name: "Bowring Hospital",        lat: 12.9784, lng: 77.6170, beds: 300, distance: "0.8 km" },
      { id: "h2", name: "St. Martha's Hospital",   lat: 12.9800, lng: 77.5900, beds: 180, distance: "1.5 km" },
      { id: "h3", name: "Manipal Hospital",        lat: 12.9592, lng: 77.6474, beds: 250, distance: "2.3 km" },
      { id: "h4", name: "NIMHANS",                 lat: 12.9402, lng: 77.5960, beds: 400, distance: "3.8 km" },
    ],
    resources: { teams: 15, ambulances: 20, boats: 0, shelterCapacity: 22000, reliefKits: 5500 },
  },

  // EAST + FLOOD
  "east_flood": {
    affectedZones: [
      { id: "az1", name: "Marathahalli Bridge",    lat: 12.9591, lng: 77.6974, severity: "critical", radius: 1300, population: 61000, density: "High" },
      { id: "az2", name: "Whitefield Low Areas",   lat: 12.9698, lng: 77.7499, severity: "high",     radius: 1000, population: 38000, density: "Medium" },
      { id: "az3", name: "Varthur Lake Overflow",  lat: 12.9400, lng: 77.7300, severity: "high",     radius: 1100, population: 29000, density: "Medium" },
    ],
    predictedZones: [
      { id: "p1", name: "Bellandur (next)",        lat: 12.9250, lng: 77.6800, risk: 0.88, eta: "~1 hr",   reason: "Bellandur lake overflow imminent", population: 44000 },
      { id: "p2", name: "Sarjapur Road (next)",    lat: 12.9100, lng: 77.6900, risk: 0.66, eta: "~2.5 hrs",reason: "Downstream drainage failure",      population: 32000 },
    ],
    routes: [
      { id: "r1", name: "ORR North Exit",          color: "#00E5FF", eta: "28 min", status: "clear",
        waypoints: [[12.9591,77.6974],[12.9700,77.6700],[12.9800,77.6400],[13.0000,77.6200]] },
      { id: "r2", name: "Whitefield-Hoskote Road", color: "#39FF14", eta: "40 min", status: "clear",
        waypoints: [[12.9698,77.7499],[12.9800,77.7700],[13.0000,77.7900],[13.0200,77.8100]] },
    ],
    hospitals: [
      { id: "h1", name: "Sakra World Hospital",    lat: 12.9591, lng: 77.6974, beds: 200, distance: "0.5 km" },
      { id: "h2", name: "Columbia Asia Whitefield",lat: 12.9698, lng: 77.7499, beds: 150, distance: "2.1 km" },
    ],
    resources: { teams: 10, ambulances: 14, boats: 8, shelterCapacity: 18000, reliefKits: 4200 },
  },

  // KORAMANGALA + CHEMICAL
  "koramangala_chemical": {
    affectedZones: [
      { id: "az1", name: "Koramangala 4th Block",  lat: 12.9352, lng: 77.6245, severity: "critical", radius: 900,  population: 32000, density: "High" },
      { id: "az2", name: "HSR Layout Sector 1",    lat: 12.9116, lng: 77.6389, severity: "high",     radius: 700,  population: 24000, density: "High" },
      { id: "az3", name: "BTM Layout",             lat: 12.9166, lng: 77.6101, severity: "medium",   radius: 600,  population: 18000, density: "Medium" },
    ],
    predictedZones: [
      { id: "p1", name: "Indiranagar (next)",      lat: 12.9784, lng: 77.6408, risk: 0.69, eta: "~1 hr",   reason: "Wind drift NE at 12 km/h",    population: 55000 },
      { id: "p2", name: "Domlur (next)",           lat: 12.9600, lng: 77.6400, risk: 0.48, eta: "~2 hrs",  reason: "Secondary contamination risk", population: 19000 },
    ],
    routes: [
      { id: "r1", name: "Hosur Road South",        color: "#39FF14", eta: "15 min", status: "clear",
        waypoints: [[12.9352,77.6245],[12.9100,77.6400],[12.8800,77.6500],[12.8500,77.6600]] },
      { id: "r2", name: "Sarjapur Road East",      color: "#FFB020", eta: "22 min", status: "clear",
        waypoints: [[12.9352,77.6245],[12.9200,77.6600],[12.9000,77.6900],[12.8800,77.7100]] },
    ],
    hospitals: [
      { id: "h1", name: "Manipal Hospital",        lat: 12.9592, lng: 77.6474, beds: 250, distance: "1.8 km" },
      { id: "h2", name: "Fortis Bannerghatta",     lat: 12.8900, lng: 77.5980, beds: 180, distance: "4.5 km" },
    ],
    resources: { teams: 9, ambulances: 10, boats: 0, shelterCapacity: 11000, reliefKits: 2600 },
  },
};

// Fallback generic scenario for any unspecified region+disaster combo
export const buildGenericScenario = (region, disasterType) => {
  const dtype = EMERGENCY_TYPES.find(e => e.id === disasterType) || EMERGENCY_TYPES[0];
  return {
    affectedZones: [
      { id: "az1", name: `${region.name} — Epicenter`,   lat: region.lat,        lng: region.lng,        severity: "critical", radius: 1100, population: 40000, density: "High" },
      { id: "az2", name: `${region.name} — Zone B`,      lat: region.lat + 0.01, lng: region.lng + 0.01, severity: "high",     radius: 800,  population: 22000, density: "Medium" },
      { id: "az3", name: `${region.name} — Periphery`,   lat: region.lat - 0.01, lng: region.lng - 0.01, severity: "medium",   radius: 600,  population: 12000, density: "Low" },
    ],
    predictedZones: [
      { id: "p1", name: "Adjacent Zone A (next)", lat: region.lat + 0.02, lng: region.lng + 0.02, risk: 0.72, eta: "~2 hrs",  reason: `${dtype.label} spread pattern`, population: 25000 },
      { id: "p2", name: "Adjacent Zone B (next)", lat: region.lat - 0.02, lng: region.lng + 0.01, risk: 0.50, eta: "~4 hrs",  reason: "Secondary cascade risk",        population: 15000 },
    ],
    routes: [
      { id: "r1", name: "Primary Evacuation Route",   color: "#00E5FF", eta: "20 min", status: "clear",
        waypoints: [[region.lat, region.lng],[region.lat + 0.03, region.lng - 0.02],[region.lat + 0.06, region.lng - 0.04]] },
      { id: "r2", name: "Secondary Evacuation Route", color: "#39FF14", eta: "30 min", status: "clear",
        waypoints: [[region.lat, region.lng],[region.lat - 0.03, region.lng + 0.02],[region.lat - 0.06, region.lng + 0.04]] },
    ],
    hospitals: [
      { id: "h1", name: "Nearest Government Hospital", lat: region.lat + 0.015, lng: region.lng + 0.015, beds: 150, distance: "2.0 km" },
      { id: "h2", name: "District Medical Centre",     lat: region.lat - 0.020, lng: region.lng - 0.010, beds: 100, distance: "3.5 km" },
    ],
    resources: { teams: 7, ambulances: 10, boats: 2, shelterCapacity: 10000, reliefKits: 2000 },
  };
};

// Get scenario for a region+disaster combo
export const getScenario = (regionId, disasterType) => {
  const key = `${regionId}_${disasterType}`;
  if (DISASTER_SCENARIOS[key]) return DISASTER_SCENARIOS[key];
  const region = BANGALORE_REGIONS.find(r => r.id === regionId);
  if (!region) return null;
  return buildGenericScenario(region, disasterType);
};

// Simulation steps: how the disaster spreads over time
export const buildSimulationSteps = (scenario) => {
  if (!scenario) return [];
  const { affectedZones, predictedZones } = scenario;
  return [
    { label: "T+0 min",  zones: [affectedZones[0]],                                    predicted: predictedZones },
    { label: "T+30 min", zones: affectedZones.slice(0, 2),                             predicted: predictedZones.slice(1) },
    { label: "T+1 hr",   zones: affectedZones,                                         predicted: predictedZones.slice(1) },
    { label: "T+2 hrs",  zones: [...affectedZones, { ...predictedZones[0], severity: "high", radius: 900 }], predicted: predictedZones.slice(1) },
    { label: "T+4 hrs",  zones: [...affectedZones, ...predictedZones.map(p => ({ ...p, severity: "medium", radius: 700 }))], predicted: [] },
  ];
};

export const SEVERITY_ZONE_COLORS = {
  critical: { fill: "rgba(255,59,59,0.25)",  stroke: "#FF3B3B" },
  high:     { fill: "rgba(255,107,53,0.20)", stroke: "#FF6B35" },
  medium:   { fill: "rgba(255,176,32,0.18)", stroke: "#FFB020" },
  low:      { fill: "rgba(57,255,20,0.12)",  stroke: "#39FF14" },
};

export const TEAM_ICONS = {
  rescue: "🚁", fire: "🚒", medical: "🚑", power: "⚡", water: "💧",
};
