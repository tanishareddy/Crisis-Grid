/**
 * useInfraData.js — Smart city infrastructure polling hook
 *
 * Polls sensor data generators for a list of assets at a configurable interval.
 * On each tick it:
 *   1. Calls the correct generator for each asset's infraType
 *   2. Stores the reading in a Map<assetId, SensorReading>
 *   3. Runs threshold checks to derive ActiveEvent[] from the readings
 *
 * Used in App.jsx with two separate instances:
 *   - Water + Gas + Comms: every 15 seconds
 *   - Physical/Civil:      every 30 seconds
 *
 * Returns:
 *   readings:     Map<assetId, SensorReading>  — latest reading per asset
 *   activeEvents: ActiveEvent[]                — threshold breaches this tick
 */
import { useState, useEffect, useRef } from "react";
import {
  generateWaterReading,
  generateGasReading,
  generateCommsReading,
  generatePhysicalReading,
} from "../data/smartCityMock";

// ── Generator dispatch table ──────────────────────────────────────────────────
// Maps each infraType string to its sensor reading generator function.
// Add new infra types here when extending the system.
const GENERATORS = {
  water:          generateWaterReading,
  gas:            generateGasReading,
  communications: generateCommsReading,
  physical:       generatePhysicalReading,
};

// ── Threshold checks → ActiveEvent[] ─────────────────────────────────────────
/**
 * deriveEvents — inspects a single sensor reading against fixed thresholds
 * and returns any ActiveEvent objects that should be raised.
 *
 * Thresholds per infra type:
 *   water:          pressureBar < 1.5 → high | pumpHealthScore < 40 → medium
 *   gas:            leakPpm > 50 → critical | pressure deviation > 20% → high
 *   communications: backhaulStatus === "offline" → critical | uptimePct < 95 → medium
 *   physical:       structuralHealthScore < 25 → critical | < 50 → high
 *
 * @param {Asset}         asset   - Asset definition (assetId, infraType, zone)
 * @param {SensorReading} reading - Latest reading from the generator
 * @returns {ActiveEvent[]}
 */
function deriveEvents(asset, reading) {
  const events = [];
  const { assetId, infraType, zone } = asset;
  const ts = reading.timestamp ?? new Date().toISOString();

  // Helper to build a consistent event object
  const makeEvent = (severity, description) => ({
    eventId:     `EVT-${assetId}-${ts}`,
    assetId,
    infraType,
    zone,
    severity,
    description,
    timestamp:   ts,
    resolved:    false,
  });

  if (infraType === "water") {
    if (reading.pressureBar < 1.5) {
      // Below 1.5 bar = potential leak or pump failure
      events.push(makeEvent("high", "Low pressure detected"));
    } else if (reading.pumpHealthScore < 40) {
      // Pump degraded but not yet causing pressure loss
      events.push(makeEvent("medium", "Pump health degraded"));
    }
  } else if (infraType === "gas") {
    if (reading.leakPpm > 50) {
      // 50 ppm is the safety threshold for gas concentration
      events.push(makeEvent("critical", "Gas leak detected"));
    } else {
      const nominal = reading.nominalPressureBar;
      // Flag if outlet pressure deviates more than 20% from nominal
      if (nominal && Math.abs(reading.outletPressureBar - nominal) / nominal > 0.20) {
        events.push(makeEvent("high", "Pressure anomaly detected"));
      }
    }
  } else if (infraType === "communications") {
    if (reading.backhaulStatus === "offline") {
      // Complete backhaul loss = tower is unreachable
      events.push(makeEvent("critical", "Backhaul offline"));
    } else if (reading.uptimePct < 95) {
      // Below 95% uptime = SLA breach territory
      events.push(makeEvent("medium", "Degraded uptime"));
    }
  } else if (infraType === "physical") {
    if (reading.structuralHealthScore < 25) {
      // Below 25 = immediate structural risk
      events.push(makeEvent("critical", "Critical structural damage"));
    } else if (reading.structuralHealthScore < 50) {
      // Below 50 = requires inspection
      events.push(makeEvent("high", "Structural health warning"));
    }
  }

  return events;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * useInfraData(assets, intervalMs)
 *
 * @param {Asset[]} assets      - Array of asset definitions to poll
 * @param {number}  intervalMs  - Polling interval in milliseconds
 * @returns {{ readings: Map, activeEvents: ActiveEvent[] }}
 */
export function useInfraData(assets, intervalMs) {
  // Map<assetId, SensorReading> — replaced wholesale on each tick
  const [readings, setReadings] = useState(() => new Map());
  // All threshold-breach events from the latest tick
  const [activeEvents, setActiveEvents] = useState([]);

  // Stable ref so the setInterval closure always sees the latest assets array
  // without needing to re-register the interval when assets change
  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    if (!assets || assets.length === 0) return;

    function tick() {
      const currentAssets = assetsRef.current;
      const newReadings = new Map();
      const newEvents = [];

      for (const asset of currentAssets) {
        const generator = GENERATORS[asset.infraType];
        if (!generator) continue; // skip unknown infra types gracefully

        const reading = generator(asset.assetId);
        newReadings.set(asset.assetId, reading);

        // Check thresholds and collect any events for this reading
        const events = deriveEvents(asset, reading);
        newEvents.push(...events);
      }

      setReadings(newReadings);
      setActiveEvents(newEvents);
    }

    // Run immediately on mount so the UI isn't blank for the first interval
    tick();
    const id = setInterval(tick, intervalMs);
    // Clean up interval on unmount or when intervalMs changes
    return () => clearInterval(id);
    // assets is intentionally excluded — we use assetsRef to avoid re-registering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { readings, activeEvents };
}
