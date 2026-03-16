/**
 * Dashboard.jsx — Main command center view
 *
 * Displays:
 *  - Status bar: live indicator, uptime counter, system status pill, Simulate Fault button
 *  - Emergency banner (shown when emergencyMode is true)
 *  - Smart City Overview panel: total assets, active faults, system risk, critical systems
 *  - Six StatCards: one per infrastructure type
 *  - Simulated Fault Feed: scrolling list of injected faults
 *  - Bangalore infrastructure map (Leaflet) with layer toggles
 *  - Risk Gauge: highest substation failure probability
 *  - Alert Panel: latest power grid anomalies
 *
 * All metric values are derived from props — no local data fetching.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { Zap, Activity, AlertTriangle, Shield, Droplets, Flame, Wifi, Building2, Server, Radio } from "lucide-react";
import BangaloreMap from "../components/BangaloreMap";
import StatCard from "../components/StatCard";
import AlertPanel from "../components/AlertPanel";
import RiskGauge from "../components/RiskGauge";
import InfraSummaryBar from "../components/InfraSummaryBar";
import { WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS } from "../data/smartCityData";

// ── Uptime formatter ──────────────────────────────────────────────────────────
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Overview stat mini-card ───────────────────────────────────────────────────
function OverviewCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      flex: 1, minWidth: 120,
      background: "var(--bg2)", borderRadius: 10,
      border: `1px solid ${color}33`,
      padding: "12px 16px",
      display: "flex", flexDirection: "column", gap: 6,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 50, height: 50,
        background: `radial-gradient(circle at top right, ${color}18, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function Dashboard({ substationData, alerts, emergencyMode, rerouteAnimation, disasterMode, disasterEmergencyType, disasterScenario, infraData, simulatedFaults = [], onInjectFault, onDismissAlert, onAlertNavigate, newAlertIds = [] }) {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeInfra, setActiveInfra] = useState("power");
  const [uptime, setUptime] = useState(0);
  const startTime = useRef(Date.now());

  // Uptime ticker
  useEffect(() => {
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Flatten substationData object into an array for easier iteration
  const active = Object.values(substationData || {});
  // Count substations currently flagged as anomalous
  const anomalyCount = active.filter(z => z.is_anomaly).length;
  // Highest failure probability across all substations — drives the Risk Gauge
  const maxRisk = active.length ? Math.max(...active.map(z => z.failure_probability || 0)) : 0;

  // ── Smart city infra metrics ──────────────────────────────────────────────
  // Derived from the live infraData Map on every poll cycle.
  // Each counter feeds a StatCard on the dashboard.
  const infraMetrics = useMemo(() => {
    let waterLeaks = 0, waterOnline = 0;
    let gasLeaks = 0, gasPressureAnomalies = 0;
    let commsOffline = 0, commsDegraded = 0;
    let physicalCritical = 0, physicalWarnings = 0;

    for (const a of WATER_ASSETS) {
      const r = infraData.get(a.assetId);
      if (!r) continue;
      if (r.pressureBar < 1.5) waterLeaks++;           // below safe pressure threshold
      if (r.status !== "offline") waterOnline++;
    }
    for (const a of GAS_ASSETS) {
      const r = infraData.get(a.assetId);
      if (!r) continue;
      if (r.leakPpm > 50) gasLeaks++;                  // above 50 ppm safety limit
      const nom = r.nominalPressureBar;
      // Flag if outlet pressure deviates more than 20% from nominal
      if (nom && Math.abs(r.outletPressureBar - nom) / nom > 0.20) gasPressureAnomalies++;
    }
    for (const a of COMMS_ASSETS) {
      const r = infraData.get(a.assetId);
      if (!r) continue;
      if (r.backhaulStatus === "offline") commsOffline++;
      else if (r.backhaulStatus === "degraded" || r.uptimePct < 95) commsDegraded++;
    }
    for (const a of PHYSICAL_ASSETS) {
      const r = infraData.get(a.assetId);
      if (!r) continue;
      if (r.structuralHealthScore < 25) physicalCritical++;  // immediate risk
      else if (r.structuralHealthScore < 50) physicalWarnings++; // needs inspection
    }

    return { waterLeaks, waterOnline, gasLeaks, gasPressureAnomalies, commsOffline, commsDegraded, physicalCritical, physicalWarnings };
  }, [infraData]);

  // Count simulated faults per infra type for the "+N simulated" sub-labels on StatCards
  const simCounts = useMemo(() => {
    const counts = { water: 0, gas: 0, communications: 0, physical: 0 };
    for (const f of simulatedFaults) {
      if (counts[f.infrastructureType] !== undefined) counts[f.infrastructureType]++;
    }
    return counts;
  }, [simulatedFaults]);

  // Only high/critical simulated faults count toward the Open Incidents card
  const simIncidentCount = useMemo(() =>
    simulatedFaults.filter(f => f.severity === "high" || f.severity === "critical").length,
  [simulatedFaults]);

  // ── Smart City Overview totals ────────────────────────────────────────────
  // Aggregated numbers shown in the four OverviewCards at the top of the page
  const totalAssets = WATER_ASSETS.length + GAS_ASSETS.length + COMMS_ASSETS.length + PHYSICAL_ASSETS.length + active.length;
  const totalActiveFaults = anomalyCount
    + infraMetrics.waterLeaks + infraMetrics.gasLeaks + infraMetrics.gasPressureAnomalies
    + infraMetrics.commsOffline + infraMetrics.physicalCritical
    + simulatedFaults.length;
  // Convert max failure probability (0–1) to a percentage for display
  const systemRiskScore = Math.round(maxRisk * 100);
  // Build a list of infra type names that are currently in a critical state
  const criticalSystems = [
    anomalyCount > 3 && "Power",
    (infraMetrics.waterLeaks + simCounts.water) > 2 && "Water",
    (infraMetrics.gasLeaks + simCounts.gas) > 0 && "Gas",
    (infraMetrics.commsOffline + simCounts.communications) > 2 && "Comms",
  ].filter(Boolean);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const handleRefresh = () => {
    setLastRefresh(new Date());
    onInjectFault?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade">

      {/* ── Status Bar ── */}
      <div style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle top-edge glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, var(--cyan)66, var(--blue)66, transparent)",
          pointerEvents: "none",
        }} />

        {/* Left: branding + date */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, var(--blue), var(--cyan))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-glow-blue)",
          }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", letterSpacing: -0.3, lineHeight: 1 }}>
              Crisis Grid
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* Center: system status pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Live indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "5px 12px",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 20, fontSize: 11,
          }}>
            <span className="live-dot" />
            <span style={{ color: "var(--green)", fontWeight: 600 }}>LIVE</span>
            <span style={{ color: "var(--text-muted)" }}>
              {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {/* Uptime */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            background: "rgba(58,134,255,0.08)",
            border: "1px solid rgba(58,134,255,0.2)",
            borderRadius: 20, fontSize: 11,
          }}>
            <Activity size={11} color="var(--blue)" />
            <span style={{ color: "var(--text-muted)" }}>Uptime</span>
            <span style={{ color: "var(--blue)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatUptime(uptime)}
            </span>
          </div>

          {/* System status */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            background: emergencyMode ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.08)",
            border: `1px solid ${emergencyMode ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.2)"}`,
            borderRadius: 20, fontSize: 11,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: emergencyMode ? "var(--red)" : "var(--green)",
              boxShadow: emergencyMode ? "0 0 6px var(--red)" : "0 0 6px var(--green)",
              animation: emergencyMode ? "pulse-red 1.5s infinite" : "none",
            }} />
            <span style={{ color: emergencyMode ? "var(--red)" : "var(--green)", fontWeight: 600 }}>
              {emergencyMode ? "EMERGENCY" : "NOMINAL"}
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-danger" onClick={handleRefresh}>
            <Zap size={13} /> Simulate Fault
          </button>
        </div>
      </div>

      {/* ── Emergency Banner ── */}
      {emergencyMode && (
        <div className="animate-slide-up" style={{
          background: "var(--red-dim)", border: "1px solid var(--red)",
          borderRadius: 10, padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 12,
          animation: "pulse-red 2s infinite",
        }}>
          <Shield size={18} color="var(--red)" />
          <div>
            <div style={{ color: "var(--red)", fontWeight: 700, fontSize: 14 }}>⚠ EMERGENCY MODE ACTIVE</div>
            <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 2 }}>
              Power prioritised to: 🏥 Hospitals · 🛡 Military · 💧 Water Treatment · 🏘 Residential
            </div>
          </div>
        </div>
      )}

      {/* ── Smart City Overview Panel ── */}
      <div style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Server size={13} color="var(--cyan)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Smart City Overview
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <OverviewCard label="Total Assets" value={totalAssets} color="var(--blue)" icon={Building2} />
          <OverviewCard label="Active Faults" value={totalActiveFaults} color={totalActiveFaults > 0 ? "var(--red)" : "var(--green)"} icon={AlertTriangle} />
          <OverviewCard
            label="System Risk"
            value={`${systemRiskScore}%`}
            color={systemRiskScore > 70 ? "var(--red)" : systemRiskScore > 40 ? "var(--amber)" : "var(--green)"}
            icon={Activity}
          />
          <OverviewCard
            label="Critical Systems"
            value={criticalSystems.length === 0 ? "None" : criticalSystems.join(", ")}
            color={criticalSystems.length > 0 ? "var(--amber)" : "var(--green)"}
            icon={Radio}
          />
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard
          label="Power Anomalies"
          value={anomalyCount}
          unit="faults"
          color={anomalyCount > 0 ? "var(--red)" : "var(--green)"}
          icon={Zap}
          sub={anomalyCount > 0 ? "Needs attention" : "All clear"}
          animDelay={0}
        />
        <StatCard
          label="Water Alerts"
          value={infraMetrics.waterLeaks + simCounts.water}
          unit="leaks"
          color={(infraMetrics.waterLeaks + simCounts.water) > 0 ? "var(--cyan)" : "var(--green)"}
          icon={Droplets}
          sub={simCounts.water > 0 ? `+${simCounts.water} simulated` : "Low pressure events"}
          animDelay={0.05}
        />
        <StatCard
          label="Gas Alerts"
          value={infraMetrics.gasLeaks + infraMetrics.gasPressureAnomalies + simCounts.gas}
          unit="issues"
          color={(infraMetrics.gasLeaks + infraMetrics.gasPressureAnomalies + simCounts.gas) > 0 ? "var(--amber)" : "var(--green)"}
          icon={Flame}
          sub={simCounts.gas > 0 ? `+${simCounts.gas} simulated` : "Leaks + pressure dev"}
          animDelay={0.1}
        />
        <StatCard
          label="Comms Offline"
          value={infraMetrics.commsOffline + simCounts.communications}
          unit="nodes"
          color={(infraMetrics.commsOffline + simCounts.communications) > 0 ? "var(--purple)" : "var(--green)"}
          icon={Wifi}
          sub={simCounts.communications > 0 ? `+${simCounts.communications} simulated` : "Backhaul down"}
          animDelay={0.15}
        />
        <StatCard
          label="Structural Alerts"
          value={infraMetrics.physicalCritical + infraMetrics.physicalWarnings + simCounts.physical}
          unit="assets"
          color={(infraMetrics.physicalCritical + infraMetrics.physicalWarnings + simCounts.physical) > 0 ? "var(--amber)" : "var(--green)"}
          icon={Shield}
          sub={simCounts.physical > 0 ? `+${simCounts.physical} simulated` : "Health score warnings"}
          animDelay={0.2}
        />
        <StatCard
          label="Open Incidents"
          value={alerts.length + simIncidentCount}
          unit="open"
          color={(alerts.length + simIncidentCount) > 0 ? "var(--amber)" : "var(--green)"}
          icon={AlertTriangle}
          sub={simIncidentCount > 0 ? `+${simIncidentCount} from simulation` : "Across all systems"}
          animDelay={0.25}
        />
      </div>

      {/* ── Simulated Fault Feed ── */}
      {simulatedFaults.length > 0 && (
        <div className="card animate-fade" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--red)44" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={13} color="var(--red)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Simulated Fault Feed</span>
            <span className="badge badge-red" style={{ marginLeft: "auto" }}>{simulatedFaults.length} active</span>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {simulatedFaults.map(f => {
              const icon = { water: "💧", gas: "🔥", communications: "📡", physical: "🏗" }[f.infrastructureType] || "⚠";
              const sevColor = f.severity === "critical" || f.severity === "high" ? "var(--red)" : f.severity === "medium" ? "var(--amber)" : "var(--green)";
              return (
                <div key={f.id} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: `${sevColor}08`, border: `1px solid ${sevColor}22`,
                  borderRadius: 7, padding: "8px 10px", fontSize: 11,
                }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{f.faultType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: sevColor, background: `${sevColor}22`, border: `1px solid ${sevColor}44`, borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>
                        {f.severity.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{f.assetName} · {f.location}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(f.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Map + Side Panel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={14} color="var(--blue)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Bangalore Infrastructure — Live Map
            </span>
            <span className="live-dot" style={{ marginLeft: "auto" }} />
          </div>
          <BangaloreMap
            substationData={substationData}
            emergencyMode={emergencyMode}
            rerouteAnimation={rerouteAnimation}
            disasterMode={disasterMode}
            disasterEmergencyType={disasterEmergencyType}
            disasterScenario={disasterScenario}
            activeInfra={activeInfra}
            infraData={infraData}
            onInfraChange={setActiveInfra}
          />
          <div style={{ padding: "0 12px 12px" }}>
            <InfraSummaryBar
              activeInfra={activeInfra}
              substationData={substationData}
              infraData={infraData}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <RiskGauge probability={maxRisk} label="Highest Substation Risk" zone="Network Max" />
          <AlertPanel alerts={alerts.slice(0, 8)} onDismiss={onDismissAlert} onNavigate={onAlertNavigate} newAlertIds={newAlertIds} />
        </div>
      </div>

      {/* ── Incident Report Modal ── */}
    </div>
  );
}
