/**
 * Crisis Grid — Bedrock AI Hook
 * Calls the Lambda/API Gateway endpoint for Claude 3.7 Sonnet analysis
 * Falls back to local rule-based analysis if API is not configured
 */
import { useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || null;
const API_KEY = import.meta.env.VITE_API_KEY || "";

// Local fallback when AWS not deployed yet
function localFallback(faultType, subName, failureProb) {
  const templates = {
    short_circuit: {
      analysis: `Short circuit detected at ${subName}. Voltage collapsed to ${(failureProb * 30).toFixed(0)}% of nominal. Fault current 3.4x normal — immediate isolation required to prevent transformer damage.`,
      cascade_risk: `High cascade risk. Adjacent substations will absorb excess load within 90 seconds if not isolated.`,
      estimated_restoration: "35–50 minutes",
      confidence: "high",
    },
    overload: {
      analysis: `${subName} operating at ${(failureProb * 120).toFixed(0)}% capacity. Transformer temperature rising. Industrial load in area exceeding planned demand — likely evening peak surge.`,
      cascade_risk: `Medium cascade risk. Downstream substations may see 30–35% load increase.`,
      estimated_restoration: "10–15 minutes with load shedding",
      confidence: "high",
    },
    transformer_overheat: {
      analysis: `Transformer at ${subName} showing thermal anomaly. Oil temperature elevated — possible cooling system failure or sustained overload. Risk of insulation breakdown if not addressed.`,
      cascade_risk: `Low immediate cascade risk. Monitor adjacent feeders.`,
      estimated_restoration: "20–30 minutes",
      confidence: "medium",
    },
    line_fault: {
      analysis: `Transmission line fault detected at ${subName}. Voltage sag indicates partial conductor contact — likely tree encroachment or storm damage on the feeder.`,
      cascade_risk: `Medium risk. Alternate path available but at reduced capacity.`,
      estimated_restoration: "25–40 minutes",
      confidence: "medium",
    },
    frequency_deviation: {
      analysis: `Frequency deviation at ${subName} indicates generation-load imbalance in the KPTCL grid. Possible sudden load pickup or generator trip upstream.`,
      cascade_risk: `High systemic risk if frequency drops below 49.0 Hz — SLDC intervention required.`,
      estimated_restoration: "5–10 minutes with governor response",
      confidence: "medium",
    },
    voltage_sag: {
      analysis: `Voltage sag at ${subName} — reactive power deficit detected. Capacitor bank may be offline or heavy motor loads starting simultaneously.`,
      cascade_risk: `Low cascade risk. Localised voltage issue.`,
      estimated_restoration: "8–12 minutes",
      confidence: "high",
    },
    earth_fault: {
      analysis: `Earth fault detected at ${subName}. Ground current flowing — insulation failure likely. Safety hazard — area must be cordoned off pending inspection.`,
      cascade_risk: `Medium risk if fault propagates to adjacent feeder.`,
      estimated_restoration: "30–45 minutes",
      confidence: "medium",
    },
  };

  const t = templates[faultType] || {
    analysis: `Anomaly detected at ${subName}. Sensor readings outside normal operating parameters.`,
    cascade_risk: "Under assessment.",
    estimated_restoration: "Unknown",
    confidence: "low",
  };

  return {
    ...t,
    immediate_actions: [
      `Isolate ${subName} feeder`,
      "Activate backup supply",
      "Dispatch BESCOM crew",
      "Notify SLDC Karnataka",
    ],
    citizen_message: `BESCOM Alert: Power disruption near ${subName} area. Crews dispatched. Estimated restoration: ${t.estimated_restoration}.`,
    source: "local_fallback",
  };
}

export function useBedrock() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyze = useCallback(async (substationData) => {
    const { substation_id, fault_type, failure_probability, severity, sensor_readings, substation_name } = substationData;

    setLoading(true);
    setError(null);

    // use local fallback if no API configured
    if (!API_URL) {
      await new Promise(r => setTimeout(r, 800)); // simulate latency
      const fallback = localFallback(fault_type, substation_name || substation_id, failure_probability);
      setResult(fallback);
      setLoading(false);
      return fallback;
    }

    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({
          substation_id,
          fault_type,
          failure_probability,
          severity,
          sensor_readings,
        }),
      });

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setResult(data);
      setLoading(false);
      return data;
    } catch (err) {
      // fallback on network error
      const fallback = localFallback(fault_type, substation_name || substation_id, failure_probability);
      setResult(fallback);
      setError(err.message);
      setLoading(false);
      return fallback;
    }
  }, []);

  const clear = useCallback(() => { setResult(null); setError(null); }, []);

  return { analyze, loading, result, error, clear };
}
