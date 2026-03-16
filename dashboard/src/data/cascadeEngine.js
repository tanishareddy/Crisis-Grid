/**
 * Crisis Grid — Cascade Failure Simulation Engine
 * Models how a fault at one BESCOM substation propagates through the network
 */
import { SUBSTATIONS, TRANSMISSION_LINES, REROUTE_PATHS } from "./bangaloreData";

// How much extra load each downstream substation absorbs when upstream fails
const LOAD_TRANSFER_FACTOR = 0.35;

// Substations that feed critical facilities
const CRITICAL_FACILITY_MAP = {
  "SUB_BTM":             ["NIMHANS Hospital"],
  "SUB_INDIRANAGAR":     ["Bowring Hospital", "Cantonment Military Base"],
  "SUB_KORAMANGALA":     ["Manipal Hospital"],
  "SUB_YELAHANKA":       ["Yelahanka Air Force Base", "Residential North"],
  "SUB_HEBBAL":          ["Tata Water Treatment (North)"],
  "SUB_ELECTRONIC_CITY": ["Cauvery Water Works (South)", "Residential South"],
  "SUB_WHITEFIELD":      ["Residential East"],
  "SUB_JP_NAGAR":        ["Residential South"],
};

// Direct downstream connections
const DOWNSTREAM = {
  "SUB_YELAHANKA":       ["SUB_HEBBAL", "SUB_YESHWANTHPUR"],
  "SUB_PEENYA":          ["SUB_RAJAJINAGAR", "SUB_YESHWANTHPUR"],
  "SUB_WHITEFIELD":      ["SUB_MARATHAHALLI", "SUB_INDIRANAGAR"],
  "SUB_ELECTRONIC_CITY": ["SUB_KORAMANGALA", "SUB_BTM", "SUB_JP_NAGAR"],
  "SUB_HEBBAL":          ["SUB_YESHWANTHPUR"],
  "SUB_MARATHAHALLI":    ["SUB_INDIRANAGAR"],
  "SUB_KORAMANGALA":     ["SUB_BTM"],
  "SUB_BTM":             ["SUB_JP_NAGAR"],
  "SUB_YESHWANTHPUR":    ["SUB_RAJAJINAGAR"],
};

/**
 * Simulate cascade failure starting from a faulted substation
 * Returns a sequence of frames for animation
 */
export function simulateCascade(faultedSubstationId, currentSubstationData) {
  const frames = [];
  const affected = new Set([faultedSubstationId]);
  const overloaded = new Set();
  const rerouted = new Set();
  const facilitiesAffected = [];

  // Frame 0 — initial fault
  frames.push({
    step: 0,
    label: `⚡ FAULT DETECTED: ${getShortName(faultedSubstationId)}`,
    faulted: [faultedSubstationId],
    overloaded: [],
    rerouted: [],
    facilitiesAffected: [],
    activeRerouteLines: [],
    description: `Critical fault at ${getName(faultedSubstationId)}. Initiating emergency protocols.`,
    delay: 0,
  });

  // Frame 1 — isolation
  frames.push({
    step: 1,
    label: `🔴 ISOLATING: ${getShortName(faultedSubstationId)}`,
    faulted: [faultedSubstationId],
    overloaded: [],
    rerouted: [],
    facilitiesAffected: CRITICAL_FACILITY_MAP[faultedSubstationId] || [],
    activeRerouteLines: [],
    description: `Circuit breakers tripped. ${getName(faultedSubstationId)} isolated from grid. ${(CRITICAL_FACILITY_MAP[faultedSubstationId] || []).join(", ")} on backup power.`,
    delay: 1200,
  });

  // Frame 2 — cascade to downstream
  const downstream = DOWNSTREAM[faultedSubstationId] || [];
  downstream.forEach(id => overloaded.add(id));

  if (downstream.length > 0) {
    frames.push({
      step: 2,
      label: `⚠ CASCADE: Load shifting to ${downstream.map(getShortName).join(", ")}`,
      faulted: [faultedSubstationId],
      overloaded: [...overloaded],
      rerouted: [],
      facilitiesAffected: [...new Set([
        ...(CRITICAL_FACILITY_MAP[faultedSubstationId] || []),
        ...downstream.flatMap(id => CRITICAL_FACILITY_MAP[id] || []),
      ])],
      activeRerouteLines: [],
      description: `Downstream substations absorbing ${(LOAD_TRANSFER_FACTOR * 100).toFixed(0)}% extra load. Overload risk at ${downstream.map(getName).join(" and ")}.`,
      delay: 2400,
    });
  }

  // Frame 3 — secondary cascade if downstream overloads
  const secondaryCascade = [];
  downstream.forEach(id => {
    const sub = SUBSTATIONS.find(s => s.id === id);
    const currentLoad = currentSubstationData?.[id]?.sensor_readings?.load_percent || 70;
    const newLoad = currentLoad + LOAD_TRANSFER_FACTOR * 100;
    if (newLoad > 95) {
      const tertiary = DOWNSTREAM[id] || [];
      tertiary.forEach(t => { if (!affected.has(t)) secondaryCascade.push(t); });
    }
  });

  if (secondaryCascade.length > 0) {
    secondaryCascade.forEach(id => overloaded.add(id));
    frames.push({
      step: 3,
      label: `🔴 SECONDARY CASCADE: ${secondaryCascade.map(getShortName).join(", ")} overloading`,
      faulted: [faultedSubstationId],
      overloaded: [...overloaded],
      rerouted: [],
      facilitiesAffected: [...new Set([
        ...(CRITICAL_FACILITY_MAP[faultedSubstationId] || []),
        ...secondaryCascade.flatMap(id => CRITICAL_FACILITY_MAP[id] || []),
      ])],
      activeRerouteLines: [],
      description: `Secondary cascade detected. ${secondaryCascade.map(getName).join(", ")} approaching critical load. Emergency rerouting initiated.`,
      delay: 3600,
    });
  }

  // Frame 4 — rerouting
  const rerouteTargets = REROUTE_PATHS[faultedSubstationId] || [];
  rerouteTargets.forEach(id => rerouted.add(id));

  const rerouteLines = rerouteTargets.map(target => ({
    from: faultedSubstationId,
    to: target,
    type: "reroute",
  }));

  frames.push({
    step: frames.length,
    label: `🔵 REROUTING: Power transferred to ${rerouteTargets.map(getShortName).join(", ")}`,
    faulted: [faultedSubstationId],
    overloaded: [...overloaded].filter(id => !rerouted.has(id)),
    rerouted: [...rerouted],
    facilitiesAffected: CRITICAL_FACILITY_MAP[faultedSubstationId] || [],
    activeRerouteLines: rerouteLines,
    description: `Emergency rerouting active. ${rerouteTargets.map(getName).join(" and ")} absorbing load from ${getName(faultedSubstationId)}. Critical facilities restored.`,
    delay: 4800,
  });

  // Frame 5 — stabilisation
  frames.push({
    step: frames.length,
    label: `✅ STABILISING: Grid recovering`,
    faulted: [faultedSubstationId],
    overloaded: downstream.slice(0, 1), // one still elevated
    rerouted: [...rerouted],
    facilitiesAffected: [],
    activeRerouteLines: rerouteLines,
    description: `Grid stabilising. Critical facilities restored via reroute. ${getName(faultedSubstationId)} offline pending repair crew. Estimated restoration: 35–45 minutes.`,
    delay: 6000,
  });

  return frames;
}

function getShortName(id) {
  return SUBSTATIONS.find(s => s.id === id)?.shortName || id;
}

function getName(id) {
  return SUBSTATIONS.find(s => s.id === id)?.name || id;
}

/**
 * Get the total population/facilities impact of a cascade
 */
export function getCascadeImpact(faultedId) {
  const downstream = DOWNSTREAM[faultedId] || [];
  const allAffected = [faultedId, ...downstream];
  const facilities = allAffected.flatMap(id => CRITICAL_FACILITY_MAP[id] || []);
  const areas = allAffected.map(id => SUBSTATIONS.find(s => s.id === id)?.area || "").filter(Boolean);

  return {
    substations_affected: allAffected.length,
    facilities_at_risk: [...new Set(facilities)],
    areas_affected: [...new Set(areas)],
    estimated_population: allAffected.length * 85000, // avg per substation coverage
  };
}
