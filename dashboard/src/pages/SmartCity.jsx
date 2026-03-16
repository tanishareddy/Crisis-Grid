/**
 * Smart City Dashboard — Gas, Water, Power infrastructure overview
 * with real-time status, map visualization, and prediction alerts
 */
import { useState, useEffect } from "react";
import { Droplets, Flame, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, MapPin, RefreshCw } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useToast } from "../context/AppContext";

// ── Simulated smart-city data generators ──────────────────────────────────────
const ZONES = [
  { id: "north", name: "North Bangalore", color: "#3A86FF" },
  { id: "south", name: "South Bangalore", color: "#22c55e" },
  { id: "east",  name: "East Bangalore",  color: "#f59e0b" },
  { id: "west",  name: "West Bangalore",  color: "#a855f7" },
];

function genTimeData(hours = 12) {
  return Array.from({ length: hours }, (_, i) => {
    const h = new Date(Date.now() - (hours - 1 - i) * 3600000);
    return {
      time: h.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      water: 70 + Math.random() * 25,
      gas:   60 + Math.random() * 30,
      power: 65 + Math.random() * 30,
    };
  });
}

function genZoneHealth() {
  return ZONES.map(z => ({
    ...z,
    water: { pressure: (3.5 + Math.random() * 2).toFixed(1), flow: (75 + Math.random() * 20).toFixed(0), status: Math.random() > 0.85 ? "warning" : "normal" },
    gas:   { pressure: (1.8 + Math.random() * 0.8).toFixed(1), flow: (80 + Math.random() * 15).toFixed(0), status: Math.random() > 0.9 ? "warning" : "normal" },
    power: { load: (60 + Math.random() * 35).toFixed(0), voltage: (220 + Math.random() * 15 - 7).toFixed(0), status: Math.random() > 0.8 ? "warning" : "normal" },
  }));
}

const PREDICTION_ALERTS = [
  { id: 1, system: "Water", zone: "North Bangalore", risk: 0.72, message: "Pipe pressure anomaly detected — possible blockage in sector 4N", time: "2 min ago", severity: "high" },
  { id: 2, system: "Gas",   zone: "West Bangalore",  risk: 0.45, message: "Flow rate deviation in distribution line W-7", time: "8 min ago", severity: "medium" },
  { id: 3, system: "Power", zone: "East Bangalore",  risk: 0.88, message: "Transformer load approaching critical threshold", time: "12 min ago", severity: "critical" },
  { id: 4, system: "Water", zone: "South Bangalore", risk: 0.31, message: "Minor pressure drop in residential supply line", time: "25 min ago", severity: "low" },
];

const SYSTEM_COLORS = { Water: "var(--cyan)", Gas: "var(--amber)", Power: "var(--blue)" };
const CHART_COLORS = { water: "#00E5FF", gas: "#f59e0b", power: "#3A86FF" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}%</strong>
        </div>
      ))}
    </div>
  );
};

// ── System Status Card ────────────────────────────────────────────────────────
function SystemCard({ icon: Icon, title, color, metrics, status }) {
  const isWarning = status === "warning";
  return (
    <div className="card animate-slide-up" style={{ padding: 18, borderColor: isWarning ? `${color}44` : "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ fontSize: 11, color: isWarning ? "var(--amber)" : "var(--green)", fontWeight: 600 }}>
            {isWarning ? "⚠ Warning" : "● Operational"}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: "var(--bg2)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>
              {m.value}<span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 3 }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Zone Health Table ─────────────────────────────────────────────────────────
function ZoneHealthTable({ zones }) {
  const statusBadge = (s) => (
    <span className={`badge badge-${s === "warning" ? "amber" : "green"}`}>
      {s === "warning" ? "Warning" : "Normal"}
    </span>
  );

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <MapPin size={14} color="var(--blue)" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Zone Health Overview</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--bg2)" }}>
              {["Zone", "Water Pressure", "Water Flow", "Gas Pressure", "Gas Flow", "Power Load", "Voltage"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((z, i) => (
              <tr key={z.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg2)" }}>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: z.color }}>{z.name}</td>
                <td style={{ padding: "10px 14px" }}>{z.water.pressure} bar {statusBadge(z.water.status)}</td>
                <td style={{ padding: "10px 14px" }}>{z.water.flow}%</td>
                <td style={{ padding: "10px 14px" }}>{z.gas.pressure} bar {statusBadge(z.gas.status)}</td>
                <td style={{ padding: "10px 14px" }}>{z.gas.flow}%</td>
                <td style={{ padding: "10px 14px" }}>{z.power.load}%</td>
                <td style={{ padding: "10px 14px" }}>{z.power.voltage}V</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SmartCity() {
  const [timeData] = useState(() => genTimeData(12));
  const [zones, setZones] = useState(() => genZoneHealth());
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();

  const refresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 600));
    setZones(genZoneHealth());
    setRefreshing(false);
    addToast("Smart city data refreshed", "success", 2500);
  };

  // auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => setZones(genZoneHealth()), 30000);
    return () => clearInterval(t);
  }, []);

  const warningZones = zones.filter(z => z.water.status === "warning" || z.gas.status === "warning" || z.power.status === "warning");

  const pieData = [
    { name: "Power", value: 45, color: "#3A86FF" },
    { name: "Water", value: 30, color: "#00E5FF" },
    { name: "Gas",   value: 25, color: "#f59e0b" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade">
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Smart City Infrastructure</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Real-time monitoring of Power, Water & Gas systems across Bangalore
          </p>
        </div>
        <button className="btn btn-ghost" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* warning banner */}
      {warningZones.length > 0 && (
        <div className="animate-slide-up" style={{ background: "var(--amber-dim)", border: "1px solid var(--amber)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} color="var(--amber)" />
          <span style={{ fontSize: 13, color: "var(--amber)", fontWeight: 600 }}>
            {warningZones.length} zone{warningZones.length > 1 ? "s" : ""} require attention
          </span>
        </div>
      )}

      {/* system cards */}
      <div className="grid-3">
        <SystemCard icon={Zap} title="Power Grid" color="var(--blue)"
          status={zones.some(z => z.power.status === "warning") ? "warning" : "normal"}
          metrics={[
            { label: "Avg Load", value: (zones.reduce((s, z) => s + +z.power.load, 0) / zones.length).toFixed(0), unit: "%" },
            { label: "Avg Voltage", value: (zones.reduce((s, z) => s + +z.power.voltage, 0) / zones.length).toFixed(0), unit: "V" },
          ]}
        />
        <SystemCard icon={Droplets} title="Water Network" color="var(--cyan)"
          status={zones.some(z => z.water.status === "warning") ? "warning" : "normal"}
          metrics={[
            { label: "Avg Pressure", value: (zones.reduce((s, z) => s + +z.water.pressure, 0) / zones.length).toFixed(1), unit: "bar" },
            { label: "Avg Flow", value: (zones.reduce((s, z) => s + +z.water.flow, 0) / zones.length).toFixed(0), unit: "%" },
          ]}
        />
        <SystemCard icon={Flame} title="Gas Distribution" color="var(--amber)"
          status={zones.some(z => z.gas.status === "warning") ? "warning" : "normal"}
          metrics={[
            { label: "Avg Pressure", value: (zones.reduce((s, z) => s + +z.gas.pressure, 0) / zones.length).toFixed(1), unit: "bar" },
            { label: "Avg Flow", value: (zones.reduce((s, z) => s + +z.gas.flow, 0) / zones.length).toFixed(0), unit: "%" },
          ]}
        />
      </div>

      {/* charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-header">
            <div className="section-title"><Activity size={15} color="var(--blue)" /> System Load — Last 12 Hours</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeData}>
              <defs>
                {Object.entries(CHART_COLORS).map(([k, c]) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} domain={[40, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="power" name="Power" stroke={CHART_COLORS.power} fill={`url(#grad-power)`} strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="water" name="Water" stroke={CHART_COLORS.water} fill={`url(#grad-water)`} strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="gas"   name="Gas"   stroke={CHART_COLORS.gas}   fill={`url(#grad-gas)`}   strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="section-header">
            <div className="section-title"><TrendingUp size={15} color="var(--cyan)" /> Resource Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "var(--panel2)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* prediction alerts */}
      <div className="card" style={{ padding: 18 }}>
        <div className="section-header">
          <div className="section-title"><AlertTriangle size={15} color="var(--amber)" /> Predictive Failure Alerts</div>
          <span className="badge badge-amber">{PREDICTION_ALERTS.length} active</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PREDICTION_ALERTS.map(a => {
            const sysColor = SYSTEM_COLORS[a.system] || "var(--blue)";
            const sevClass = a.severity === "critical" ? "red" : a.severity === "high" ? "red" : a.severity === "medium" ? "amber" : "green";
            return (
              <div key={a.id} className="animate-slide-up" style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "var(--bg2)", borderRadius: 8, border: `1px solid var(--border)` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sysColor, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: sysColor }}>{a.system}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.zone}</span>
                    <span className={`badge badge-${sevClass}`}>{a.severity}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{a.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{a.message}</div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Risk:</span>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${a.risk * 100}%`, background: a.risk > 0.7 ? "var(--red)" : a.risk > 0.4 ? "var(--amber)" : "var(--green)" }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: a.risk > 0.7 ? "var(--red)" : a.risk > 0.4 ? "var(--amber)" : "var(--green)" }}>{(a.risk * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* zone health table */}
      <ZoneHealthTable zones={zones} />
    </div>
  );
}
