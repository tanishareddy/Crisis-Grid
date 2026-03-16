/**
 * InfraSummaryBar — AI-style real-time summary below the map
 * Derives concise status text from live infraData readings
 */
import { useMemo, useState, useEffect } from "react";
import { Cpu } from "lucide-react";
import { INFRA_LAYERS } from "./InfrastructureToggle";
import { WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS } from "../data/smartCityData";
import { SUBSTATIONS } from "../data/bangaloreData";

// ─── Summary generators per infra type ───────────────────────────────────────

function powerSummary(substationData) {
  const vals = Object.values(substationData || {});
  if (!vals.length) return { text: "Power grid data loading…", status: "normal" };

  const offline  = vals.filter(v => v.severity === "critical" || v.severity === "high");
  const anomalies = vals.filter(v => v.is_anomaly);
  const avgLoad  = vals.length
    ? (vals.reduce((s, v) => s + (v.sensor_readings?.load_percent || 0), 0) / vals.length).toFixed(0)
    : 0;
  const maxRisk  = vals.length ? Math.max(...vals.map(v => v.failure_probability || 0)) : 0;

  const homesAffected = offline.length * 2100;
  let text = "";
  if (offline.length > 0) {
    text += `${offline.length} substation${offline.length > 1 ? "s" : ""} at critical/high risk, affecting ~${homesAffected.toLocaleString()} homes. `;
  } else {
    text += `All ${SUBSTATIONS.length} substations operating normally. `;
  }
  text += `Avg grid load ${avgLoad}%. `;
  if (anomalies.length > 0) text += `${anomalies.length} active fault${anomalies.length > 1 ? "s" : ""} detected. `;
  text += `Highest failure probability: ${(maxRisk * 100).toFixed(0)}%.`;

  const status = offline.length > 2 ? "critical" : offline.length > 0 ? "warning" : "normal";
  return { text, status };
}

function waterSummary(infraData) {
  const readings = WATER_ASSETS.map(a => infraData?.get(a.assetId)).filter(Boolean);
  if (!readings.length) return { text: "Water infrastructure data loading…", status: "normal" };

  const lowPressure = readings.filter(r => r.pressureBar < 1.5);
  const leaks       = readings.filter(r => r.leakDetected);
  const pumpWarn    = readings.filter(r => r.pumpHealthScore < 40);
  const avgPressure = (readings.reduce((s, r) => s + r.pressureBar, 0) / readings.length).toFixed(1);

  let text = "";
  if (leaks.length > 0) {
    text += `${leaks.length} leak${leaks.length > 1 ? "s" : ""} detected across distribution network. `;
  }
  if (lowPressure.length > 0) {
    text += `Pressure drop in ${lowPressure.length} sector${lowPressure.length > 1 ? "s" : ""} (below 1.5 bar). `;
  }
  if (pumpWarn.length > 0) {
    text += `${pumpWarn.length} pump${pumpWarn.length > 1 ? "s" : ""} showing degraded health. `;
  }
  if (!leaks.length && !lowPressure.length && !pumpWarn.length) {
    text += `All water assets nominal. `;
  }
  text += `Avg network pressure: ${avgPressure} bar.`;

  const status = leaks.length > 0 || lowPressure.length > 1 ? "critical"
               : lowPressure.length > 0 || pumpWarn.length > 0 ? "warning" : "normal";
  return { text, status };
}

function gasSummary(infraData) {
  const readings = GAS_ASSETS.map(a => infraData?.get(a.assetId)).filter(Boolean);
  if (!readings.length) return { text: "Gas infrastructure data loading…", status: "normal" };

  const leaks    = readings.filter(r => r.leakPpm > 50);
  const minorLeak = readings.filter(r => r.leakPpm > 20 && r.leakPpm <= 50);
  const pressureAnomaly = readings.filter(r => {
    const dev = r.nominalPressureBar
      ? Math.abs(r.outletPressureBar - r.nominalPressureBar) / r.nominalPressureBar
      : 0;
    return dev > 0.20;
  });
  const avgFlow = (readings.reduce((s, r) => s + r.flowM3h, 0) / readings.length).toFixed(0);

  let text = "";
  if (leaks.length > 0) {
    text += `⚠ ${leaks.length} critical gas leak${leaks.length > 1 ? "s" : ""} detected (>${50} ppm). Isolation recommended. `;
  } else if (minorLeak.length > 0) {
    text += `${minorLeak.length} minor leak${minorLeak.length > 1 ? "s" : ""} reported, contained. `;
  }
  if (pressureAnomaly.length > 0) {
    text += `Pressure anomaly in ${pressureAnomaly.length} pipeline${pressureAnomaly.length > 1 ? "s" : ""}. `;
  }
  if (!leaks.length && !minorLeak.length && !pressureAnomaly.length) {
    text += `Gas distribution nominal. `;
  }
  text += `Avg flow: ${avgFlow} m³/h.`;

  const status = leaks.length > 0 ? "critical"
               : pressureAnomaly.length > 0 || minorLeak.length > 0 ? "warning" : "normal";
  return { text, status };
}

function commsSummary(infraData) {
  const readings = COMMS_ASSETS.map(a => infraData?.get(a.assetId)).filter(Boolean);
  if (!readings.length) return { text: "Communications data loading…", status: "normal" };

  const offline  = readings.filter(r => r.backhaulStatus === "offline");
  const degraded = readings.filter(r => r.backhaulStatus === "degraded" || r.uptimePct < 95);
  const totalConn = readings.reduce((s, r) => s + (r.activeConnections || 0), 0);
  const avgUptime = (readings.reduce((s, r) => s + r.uptimePct, 0) / readings.length).toFixed(1);

  let text = "";
  if (offline.length > 0) {
    text += `${offline.length} backhaul node${offline.length > 1 ? "s" : ""} offline. `;
  }
  if (degraded.length > 0) {
    text += `${degraded.length} node${degraded.length > 1 ? "s" : ""} with degraded uptime. `;
  }
  if (!offline.length && !degraded.length) {
    text += `All communication nodes operational. `;
  }
  text += `Network uptime: ${avgUptime}%. Active connections: ${totalConn.toLocaleString()}.`;

  const status = offline.length > 0 ? "critical"
               : degraded.length > 0 ? "warning" : "normal";
  return { text, status };
}

function physicalSummary(infraData) {
  const readings = PHYSICAL_ASSETS.map(a => infraData?.get(a.assetId)).filter(Boolean);
  if (!readings.length) return { text: "Physical infrastructure data loading…", status: "normal" };

  const critical = readings.filter(r => r.structuralHealthScore < 25);
  const warning  = readings.filter(r => r.structuralHealthScore >= 25 && r.structuralHealthScore < 50);
  const avgHealth = (readings.reduce((s, r) => s + r.structuralHealthScore, 0) / readings.length).toFixed(0);
  const highVib  = readings.filter(r => r.vibrationMms > 2.5);

  let text = "";
  if (critical.length > 0) {
    text += `${critical.length} structure${critical.length > 1 ? "s" : ""} at critical health — immediate inspection required. `;
  }
  if (warning.length > 0) {
    text += `${warning.length} asset${warning.length > 1 ? "s" : ""} showing structural health warnings. `;
  }
  if (highVib.length > 0) {
    text += `Elevated vibration on ${highVib.length} asset${highVib.length > 1 ? "s" : ""}. `;
  }
  if (!critical.length && !warning.length && !highVib.length) {
    text += `All physical structures within safe parameters. `;
  }
  text += `Avg structural health: ${avgHealth}/100.`;

  const status = critical.length > 0 ? "critical"
               : warning.length > 0 || highVib.length > 0 ? "warning" : "normal";
  return { text, status };
}

const STATUS_STYLE = {
  normal:   { bg: "rgba(57,255,20,0.06)",  border: "rgba(57,255,20,0.25)",  dot: "#39FF14", label: "ALL SYSTEMS NOMINAL" },
  warning:  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)",  dot: "#f59e0b", label: "ATTENTION REQUIRED"   },
  critical: { bg: "rgba(255,59,59,0.08)",  border: "rgba(255,59,59,0.35)",  dot: "#FF3B3B", label: "CRITICAL ALERT"       },
};

export default function InfraSummaryBar({ activeInfra, substationData, infraData }) {
  const [animKey, setAnimKey] = useState(0);

  // Trigger re-animation on infra switch
  useEffect(() => { setAnimKey(k => k + 1); }, [activeInfra]);

  const summary = useMemo(() => {
    switch (activeInfra) {
      case "power":          return powerSummary(substationData);
      case "water":          return waterSummary(infraData);
      case "gas":            return gasSummary(infraData);
      case "communications": return commsSummary(infraData);
      case "physical":       return physicalSummary(infraData);
      default:               return { text: "Select an infrastructure layer.", status: "normal" };
    }
  }, [activeInfra, substationData, infraData]);

  const layer  = INFRA_LAYERS.find(l => l.id === activeInfra);
  const style  = STATUS_STYLE[summary.status];

  return (
    <div
      key={animKey}
      className="animate-fade"
      style={{
        marginTop: 10,
        padding: "12px 16px",
        borderRadius: 10,
        background: style.bg,
        border: `1px solid ${style.border}`,
        display: "flex", alignItems: "flex-start", gap: 12,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${layer?.color || "#3A86FF"}18`,
        border: `1px solid ${layer?.color || "#3A86FF"}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
      }}>
        {layer?.icon || "⚡"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <Cpu size={11} color={style.dot} />
          <span style={{ fontSize: 10, fontWeight: 700, color: style.dot, letterSpacing: 1, textTransform: "uppercase" }}>
            AI Summary · {layer?.label || "Infrastructure"}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
            background: `${style.dot}22`, color: style.dot, letterSpacing: 0.5,
          }}>
            {style.label}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-muted)" }}>
            Updated just now
          </span>
        </div>

        {/* Summary text */}
        <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
          {summary.text}
        </p>
      </div>
    </div>
  );
}
