/**
 * HistoricalAnalytics.jsx — 14-day trend analysis page
 *
 * Structure:
 *  - Infrastructure toggle (Power / Water / Gas / Communications / Civil)
 *  - Power tab: uses real mockData generators (transformer temp, load, voltage, failures)
 *  - Other tabs: use synthetic generateInfraHistory() data
 *  - All tabs: AI Failure Pattern Analyzer section at the bottom
 *
 * The AI Failure Pattern Analyzer uses static AI_PATTERNS data keyed per infra type.
 * In a production system this would call a real analytics API.
 */
import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { generateHistoricalData, FUTURE_RISK_ZONES } from "../data/mockData";

import { TrendingUp, Clock, AlertTriangle, Brain, Zap, Droplets, Flame, Wifi, Building2 } from "lucide-react";

// ─── Infrastructure config ────────────────────────────────────────────────────
const INFRA_TABS = [
  { id: "power",          label: "Power",          icon: Zap,       color: "#3A86FF" },
  { id: "water",          label: "Water",          icon: Droplets,  color: "#00E5FF" },
  { id: "gas",            label: "Gas / LPG",      icon: Flame,     color: "#f59e0b" },
  { id: "communications", label: "Communications", icon: Wifi,      color: "#a855f7" },
  { id: "civil",          label: "Civil / Bridges",icon: Building2, color: "#39FF14" },
];

// ─── Synthetic historical data per infra type ─────────────────────────────────
// Generates day-by-day aggregated data for the 14-day window.
// Each hour has an 8% chance of a fault event (Math.random() > 0.92).
// Aggregates per calendar day: fault count, avg severity, avg repair time, avg risk.
// Used for all non-power tabs since we don't have real historical data for those.
function generateInfraHistory(type, days = 14) {
  const now = new Date();
  const map = {};
  for (let i = days * 24; i >= 0; i--) {
    const t = new Date(now - i * 3600000);
    const label = t.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    if (!map[label]) map[label] = { time: label, faults: 0, severity: [], repairTimes: [], risk: [] };
    const d = map[label];
    const hasFault = Math.random() > 0.92;
    if (hasFault) {
      d.faults += 1;
      d.severity.push(Math.random() * 10);
      d.repairTimes.push(20 + Math.random() * 100);
      d.risk.push(0.3 + Math.random() * 0.6);
    } else {
      d.risk.push(0.05 + Math.random() * 0.2);
    }
  }
  return Object.values(map).map(d => ({
    time: d.time,
    faults: d.faults,
    avgSeverity: d.severity.length ? +(d.severity.reduce((a, b) => a + b, 0) / d.severity.length).toFixed(1) : 0,
    avgRepairTime: d.repairTimes.length ? +(d.repairTimes.reduce((a, b) => a + b, 0) / d.repairTimes.length).toFixed(0) : 0,
    avgRisk: +(d.risk.reduce((a, b) => a + b, 0) / d.risk.length).toFixed(2),
  }));
}

// ─── AI pattern analysis per infra type ──────────────────────────────────────
const AI_PATTERNS = {
  power: {
    topFailures: [
      { label: "Transformer overheating", count: 12, zone: "Peenya" },
      { label: "Voltage sag events", count: 9, zone: "Whitefield" },
      { label: "Earth fault trips", count: 7, zone: "Electronic City" },
    ],
    causes: ["Overload conditions during peak hours (6–10 PM)", "Aging infrastructure (pre-2000 transformers)", "Monsoon-related insulation degradation"],
    recommendations: ["Schedule preventive maintenance for Peenya substation", "Replace aging transformers commissioned before 2000", "Increase monitoring frequency during evening peak"],
  },
  water: {
    topFailures: [
      { label: "Pipeline pressure drops", count: 10, zone: "Hebbal" },
      { label: "Pump health degradation", count: 8, zone: "KR Puram" },
      { label: "Leak detections", count: 6, zone: "Indiranagar" },
    ],
    causes: ["Aging cast-iron pipes (30+ years)", "Seasonal demand spikes in summer", "Poor joint sealing in older pipeline segments"],
    recommendations: ["Replace cast-iron pipes in Hebbal zone", "Install automated leak detection sensors", "Increase pump inspection frequency to monthly"],
  },
  gas: {
    topFailures: [
      { label: "Outlet pressure deviations", count: 11, zone: "Peenya" },
      { label: "Valve cluster failures", count: 7, zone: "Yelahanka" },
      { label: "Low-level leak detections", count: 5, zone: "Electronic City" },
    ],
    causes: ["Corrosion in older pipeline segments", "Pressure regulator wear", "Temperature-induced expansion in summer"],
    recommendations: ["Inspect and replace corroded pipeline segments", "Calibrate pressure regulators quarterly", "Deploy gas leak sensors at high-risk junctions"],
  },
  communications: {
    topFailures: [
      { label: "Cell tower signal drops", count: 14, zone: "Whitefield" },
      { label: "Fibre node outages", count: 9, zone: "Electronic City" },
      { label: "Backhaul link failures", count: 6, zone: "Yelahanka" },
    ],
    causes: ["Power fluctuations affecting tower UPS", "Physical damage during construction activity", "Overloaded backhaul during peak data hours"],
    recommendations: ["Upgrade UPS systems at high-risk towers", "Coordinate with BBMP on construction near fibre routes", "Add redundant backhaul links in Whitefield corridor"],
  },
  civil: {
    topFailures: [
      { label: "Bridge structural health drops", count: 5, zone: "KR Puram" },
      { label: "Road segment deterioration", count: 13, zone: "Peenya" },
      { label: "Building vibration alerts", count: 4, zone: "Hebbal" },
    ],
    causes: ["Heavy vehicle overloading on bridges", "Monsoon waterlogging weakening road base", "Construction vibration near older structures"],
    recommendations: ["Enforce weight limits on KR Puram bridges", "Improve drainage infrastructure in Peenya", "Conduct structural audits for buildings near construction zones"],
  },
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function HistoricalAnalytics() {
  const [activeTab, setActiveTab] = useState("power");
  const tab = INFRA_TABS.find(t => t.id === activeTab);

  // Power-specific data (existing logic preserved)
  const powerRaw = useMemo(() => generateHistoricalData(14), []);
  const powerDaily = useMemo(() => {
    const map = {};
    powerRaw.forEach(r => {
      if (!map[r.time]) map[r.time] = { time: r.time, temp: [], load: [], voltage: [], failures: 0 };
      map[r.time].temp.push(r.transformer_temp);
      map[r.time].load.push(r.load);
      map[r.time].voltage.push(r.voltage);
      map[r.time].failures += r.failures;
    });
    return Object.values(map).map(d => ({
      time: d.time,
      avg_temp: +(d.temp.reduce((a, b) => a + b, 0) / d.temp.length).toFixed(1),
      avg_load: +(d.load.reduce((a, b) => a + b, 0) / d.load.length).toFixed(1),
      avg_voltage: +(d.voltage.reduce((a, b) => a + b, 0) / d.voltage.length).toFixed(1),
      failures: d.failures,
    }));
  }, [powerRaw]);

  // Generic infra data for non-power tabs
  const infraDaily = useMemo(() => generateInfraHistory(activeTab, 14), [activeTab]);

  const aiData = AI_PATTERNS[activeTab];

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Historical Analytics</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>14-day trend analysis across all grid zones</p>
      </div>

      {/* Infrastructure Toggle */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24,
        background: "var(--panel)", borderRadius: 12, padding: 6,
        border: "1px solid var(--border)", width: "fit-content",
      }}>
        {INFRA_TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: isActive ? `${t.color}22` : "transparent",
                color: isActive ? t.color : "var(--text-muted)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                borderBottom: isActive ? `2px solid ${t.color}` : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--panel2)"; e.currentTarget.style.color = "var(--text)"; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── POWER-specific charts (existing logic) ── */}
        {activeTab === "power" && (
          <>
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp size={15} color="var(--red)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Transformer Temperature Trend (°C)</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={powerDaily}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3B3B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF3B3B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[50, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="avg_temp" name="Avg Temp" stroke="var(--red)" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp size={15} color="var(--amber)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Load Fluctuations (%)</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={powerDaily}>
                  <defs>
                    <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFB020" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FFB020" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[50, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="avg_load" name="Avg Load %" stroke="var(--amber)" fill="url(#loadGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <AlertTriangle size={15} color="var(--cyan)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Failure Events per Day</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={powerDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="failures" name="Failures" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Clock size={15} color="var(--blue)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Voltage Stability (V)</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={powerDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[210, 245]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avg_voltage" name="Avg Voltage" stroke="var(--cyan)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Future Risk Zones — power only */}
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={15} color="var(--amber)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Future Risk Zones</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FUTURE_RISK_ZONES.map(r => {
                  const color = r.risk > 0.7 ? "var(--red)" : r.risk > 0.5 ? "var(--amber)" : "var(--green)";
                  const pct = r.risk * 100;
                  return (
                    <div key={r.zone} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{r.zone}</span>
                        <span style={{ color, fontWeight: 700 }}>{pct.toFixed(0)}% risk — {r.eta}</span>
                      </div>
                      <div style={{ background: "var(--bg)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 1s ease" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.reason}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Generic infra charts for non-power tabs ── */}
        {activeTab !== "power" && (
          <>
            {/* Fault Frequency */}
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <AlertTriangle size={15} color={tab.color} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Fault Frequency Over Time</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={infraDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="faults" name="Faults" fill={tab.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Incident Severity */}
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp size={15} color="var(--amber)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Incident Severity Distribution</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={infraDaily}>
                  <defs>
                    <linearGradient id="sevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tab.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tab.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[0, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="avgSeverity" name="Avg Severity" stroke={tab.color} fill="url(#sevGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Avg Repair Time */}
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Clock size={15} color="var(--cyan)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Average Repair Time (minutes)</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={infraDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avgRepairTime" name="Repair Time (min)" stroke="var(--cyan)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Trend */}
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp size={15} color="var(--red)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Risk Trend</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={infraDaily}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3B3B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF3B3B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[0, 1]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="avgRisk" name="Risk Score" stroke="var(--red)" fill="url(#riskGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── AI Failure Pattern Analyzer ── */}
        <div style={{ background: "var(--panel)", borderRadius: 12, border: `1px solid ${tab.color}44`, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `${tab.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={17} color={tab.color} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>AI Failure Pattern Analyzer</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Scanning {tab.label} fault history · Detecting recurring patterns
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Faults (30d)", value: aiData.topFailures.reduce((a, b) => a + b.count, 0), color: "var(--red)" },
              { label: "Unique Patterns", value: aiData.topFailures.length, color: tab.color },
              { label: "Zones Affected", value: new Set(aiData.topFailures.map(f => f.zone)).size, color: "var(--amber)" },
              { label: "Recommendations", value: aiData.recommendations.length, color: "var(--green)" },
            ].map(card => (
              <div key={card.label} style={{
                background: "var(--bg)", borderRadius: 10, padding: "14px 16px",
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Most Repeated Failures */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-dim)" }}>Most Repeated Failures</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aiData.topFailures.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "var(--bg)", borderRadius: 8, padding: "10px 14px",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: `${tab.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: tab.color,
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {f.label} detected <span style={{ color: "var(--red)" }}>{f.count} times</span> in the last 30 days
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Zone: {f.zone}</div>
                  </div>
                  <div style={{ background: "var(--bg)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: tab.color, border: `1px solid ${tab.color}44` }}>
                    {f.count}x
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top problem assets bar chart */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-dim)" }}>Top Problem Assets</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={aiData.topFailures.map(f => ({ name: f.label.split(" ").slice(0, 2).join(" "), count: f.count, zone: f.zone }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Occurrences" fill={tab.color} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Possible Causes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-dim)" }}>Possible Causes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {aiData.causes.map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: "rgba(255,59,59,0.06)", borderRadius: 8, padding: "9px 12px",
                  border: "1px solid rgba(255,59,59,0.15)",
                }}>
                  <AlertTriangle size={13} color="var(--amber)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text)" }}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-dim)" }}>Recommendations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {aiData.recommendations.map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: "rgba(57,255,20,0.06)", borderRadius: 8, padding: "9px 12px",
                  border: "1px solid rgba(57,255,20,0.15)",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", marginTop: 5, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text)" }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
