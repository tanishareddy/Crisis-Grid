/**
 * Predefined solution templates for infrastructure incidents.
 * Used when no manual solution is provided.
 */

const SOLUTIONS = {
  power: {
    "Power Outage": {
      steps: [
        "Identify the affected feeder and isolate the faulted section using remote switching.",
        "Dispatch field crew to inspect the last known healthy segment.",
        "Restore supply to unaffected zones via alternate feeder paths.",
        "Notify BESCOM control room and log the outage in the fault management system.",
        "Once fault is cleared, re-energise in stages and monitor for recurrence.",
      ],
      estimatedTime: "30–90 minutes",
      priority: "Immediate",
    },
    "Transformer Fault": {
      steps: [
        "De-energise the transformer and lock out / tag out (LOTO) the unit.",
        "Perform insulation resistance and turns-ratio tests to confirm fault type.",
        "If oil temperature is elevated, activate cooling fans and check oil level.",
        "Switch load to standby transformer if available.",
        "Schedule transformer inspection or replacement with maintenance team.",
      ],
      estimatedTime: "1–4 hours",
      priority: "High",
    },
    "Line Damage": {
      steps: [
        "Isolate the damaged line segment at both ends using circuit breakers.",
        "Erect safety barriers and notify public of hazard zone.",
        "Dispatch line crew with replacement conductor and hardware.",
        "Perform visual inspection for tree encroachment or storm damage.",
        "Re-energise after crew clearance and perform voltage checks.",
      ],
      estimatedTime: "2–6 hours",
      priority: "High",
    },
    "Overload": {
      steps: [
        "Identify top consumers on the overloaded feeder via SCADA.",
        "Initiate voluntary load shedding requests to large industrial consumers.",
        "Transfer partial load to adjacent feeders with available capacity.",
        "Monitor transformer temperature every 15 minutes.",
        "Plan demand-side management measures for peak hours.",
      ],
      estimatedTime: "15–45 minutes",
      priority: "Medium",
    },
    "Equipment Failure": {
      steps: [
        "Isolate the failed equipment and switch to backup unit if available.",
        "Document failure mode and capture any error codes or alarms.",
        "Contact OEM support or maintenance contractor.",
        "Perform root cause analysis before returning equipment to service.",
      ],
      estimatedTime: "1–8 hours",
      priority: "High",
    },
    default: {
      steps: [
        "Assess the situation and ensure personnel safety first.",
        "Isolate the affected infrastructure segment.",
        "Notify the relevant operations team and log the incident.",
        "Restore service using backup systems where available.",
        "Document findings and schedule preventive maintenance.",
      ],
      estimatedTime: "Variable",
      priority: "Medium",
    },
  },

  water: {
    "Pipe Burst": {
      steps: [
        "Close the nearest upstream isolation valve to stop flow.",
        "Notify affected residents via BWSSB alert system.",
        "Deploy emergency water tankers to the affected zone.",
        "Excavate and expose the burst section — assess pipe condition.",
        "Replace damaged section and pressure-test before reopening.",
      ],
      estimatedTime: "4–12 hours",
      priority: "Immediate",
    },
    "Pressure Drop": {
      steps: [
        "Check pump station status and verify all pumps are operational.",
        "Inspect for open or partially closed valves in the distribution network.",
        "Look for unreported leaks using acoustic leak detection equipment.",
        "Adjust pump speed or activate standby pump to restore pressure.",
        "Monitor pressure gauges at key nodes for 30 minutes post-fix.",
      ],
      estimatedTime: "1–3 hours",
      priority: "High",
    },
    "Contamination": {
      steps: [
        "Immediately issue a boil-water advisory for the affected zone.",
        "Isolate the contaminated segment and flush the distribution main.",
        "Collect water samples and send to BWSSB lab for analysis.",
        "Identify contamination source — check for cross-connections or backflow.",
        "Chlorinate the affected section and re-test before lifting advisory.",
      ],
      estimatedTime: "6–24 hours",
      priority: "Critical",
    },
    default: {
      steps: [
        "Isolate the affected water main section.",
        "Notify BWSSB operations centre and affected consumers.",
        "Deploy tanker supply as interim measure.",
        "Inspect and repair the fault, then restore supply.",
        "Log incident and schedule follow-up inspection.",
      ],
      estimatedTime: "Variable",
      priority: "High",
    },
  },

  gas: {
    "Gas Leak": {
      steps: [
        "Evacuate all personnel from the immediate area — 50m radius minimum.",
        "Close the nearest upstream isolation valve immediately.",
        "Eliminate all ignition sources — no electrical switches, phones, or flames.",
        "Call GAIL emergency line and local fire brigade.",
        "Ventilate the area naturally — do not use fans or electrical equipment.",
        "Allow only certified gas engineers to inspect and repair the leak.",
        "Pressure-test the repaired section before restoring supply.",
      ],
      estimatedTime: "2–8 hours",
      priority: "Critical",
    },
    "Pressure Deviation": {
      steps: [
        "Check pressure regulator settings at the district regulating station.",
        "Inspect for blockages or partial valve closures in the distribution line.",
        "Verify compressor station output and adjust as needed.",
        "Monitor downstream pressure at consumer meters.",
        "Log deviation and notify GAIL control room.",
      ],
      estimatedTime: "30–90 minutes",
      priority: "High",
    },
    default: {
      steps: [
        "Ensure area safety and eliminate ignition sources.",
        "Isolate the affected gas line segment.",
        "Notify GAIL operations and emergency services.",
        "Inspect and repair the fault with certified personnel only.",
        "Restore supply after pressure testing and safety clearance.",
      ],
      estimatedTime: "Variable",
      priority: "High",
    },
  },

  general: {
    default: {
      steps: [
        "Assess the incident and ensure all personnel are safe.",
        "Isolate the affected infrastructure to prevent escalation.",
        "Notify the relevant operations team immediately.",
        "Deploy maintenance crew to investigate and repair.",
        "Document the incident and implement corrective actions.",
      ],
      estimatedTime: "Variable",
      priority: "Medium",
    },
  },
};

/**
 * Returns a solution object { steps, estimatedTime, priority } for a given
 * infrastructure type and incident type.
 */
export function generateSolution(infraType = "general", incidentType = "") {
  const domain = SOLUTIONS[infraType?.toLowerCase()] || SOLUTIONS.general;
  return domain[incidentType] || domain.default || SOLUTIONS.general.default;
}

/** Map fault_type strings (from power grid alerts) to solution keys */
export function faultTypeToSolution(faultType) {
  const map = {
    short_circuit:        { infra: "power", type: "Line Damage" },
    overload:             { infra: "power", type: "Overload" },
    transformer_overheat: { infra: "power", type: "Transformer Fault" },
    line_fault:           { infra: "power", type: "Line Damage" },
    frequency_deviation:  { infra: "power", type: "Equipment Failure" },
    voltage_sag:          { infra: "power", type: "Equipment Failure" },
    earth_fault:          { infra: "power", type: "Line Damage" },
  };
  return map[faultType] || { infra: "power", type: "default" };
}
