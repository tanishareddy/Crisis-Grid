import { useState, useMemo } from "react";
import { SUBSTATIONS } from "../data/bangaloreData";
import { Thermometer, Zap, Activity, Wifi, Shield, AlertTriangle, Search } from "lucide-react";
import StatCard from "../components/StatCard";

const SEV_COLOR = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)", critical: "var(--red)" };
const SEV_LABEL = { low: "NORMAL", medium: "WARNING", high: "HIGH RISK", critical: "CRITICAL" };
const SEV_CLASS = { low: "green", medium: "amber", high: "red", critical: "red" };

function Meter({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar" style={{ flex: 1 }}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SubstationCard({ sub, data, index }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;
  const color = SEV_COLOR[data.severity] || "var(--green)";
  const r = data.sensor_readings || {};
  const isCritical = data.severity === "critical";

  return (
    <div
      className="card animate-slide-up"
      style={{
        padding: 16,
        borderColor: `${color}44`,
        animation: isCritical ? "pulse-red 2s infinite" : "none",
        animationDelay: `${index * 0.04}s`,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={13} color={color} />
            {sub.shortName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {sub.area} · {sub.voltage_kv}kV · {sub.capacity_mva} MVA
          </div>
          <div style={{ fontSize: 11, marginTop: 3, fontWeight: data.fault_type !== "normal" ? 600 : 400, color: data.fault_type !== "normal" ? color : "var(--text-muted)" }}>
            {data.fault_type !== "normal" ? data.fault_type.replace(/_/g, " ").toUpperCase() : "Operating normally"}
          </div>
        </div>
        <span className={`badge badge-${SEV_CLASS[data.severity] || "green"}`}>
          {SEV_LABEL[data.severity]}
        </span>
      </div>

      {/* sensor metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Voltage", value: r.voltage_v?.toFixed(1), unit: "V", max: sub.voltage_kv >= 110 ? 250 : 75, icon: Zap, col: "var(--blue)" },
          { label: "Current", value: r.current_a?.toFixed(1), unit: "A", max: 150, icon: Activity, col: "var(--cyan)" },
          { label: "Temp",    value: r.transformer_temp_c?.toFixed(1), unit: "°C", max: 120, icon: Thermometer, col: color },
          { label: "Load",    value: r.load_percent?.toFixed(1), unit: "%", max: 100, icon: Wifi, col: r.load_percent > 85 ? "var(--red)" : "var(--amber)" },
        ].map(m => (
          <div key={m.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
              <m.icon size={10} color={m.col} />{m.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: m.col, minWidth: 48 }}>
                {m.value}<span style={{ fontSize: 9, color: "var(--text-muted)" }}> {m.unit}</span>
              </span>
              <Meter value={parseFloat(m.value)} max={m.max} color={m.col} />
            </div>
          </div>
        ))}
      </div>

      {/* footer row */}
      <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 8, flexWrap: "wrap", fontSize: 11 }}>
        <span style={{ color: "var(--text-muted)" }}>
          Freq: <strong style={{ color: Math.abs((r.frequency_hz || 50) - 50) > 1 ? "var(--red)" : "var(--green)" }}>
            {r.frequency_hz?.toFixed(2)} Hz
          </strong>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          PF: <strong style={{ color: "var(--cyan)" }}>{r.power_factor?.toFixed(3)}</strong>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          Health: <strong style={{ color: r.health_score > 70 ? "var(--green)" : r.health_score > 40 ? "var(--amber)" : "var(--red)" }}>
            {r.health_score?.toFixed(0)}/100
          </strong>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          Risk: <strong style={{ color }}>{(data.failure_probability * 100).toFixed(0)}%</strong>
        </span>
      </div>

      {/* expanded extra details */}
      {expanded && (
        <div className="animate-fade-fast" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          {[
            { label: "Oil Level", value: `${r.oil_level_pct?.toFixed(0)}%`, color: r.oil_level_pct < 70 ? "var(--red)" : "var(--green)" },
            { label: "Vibration", value: `${r.vibration_mm_s?.toFixed(2)} mm/s`, color: r.vibration_mm_s > 2 ? "var(--amber)" : "var(--green)" },
            { label: "Active Power", value: `${(r.active_power_kw / 1000).toFixed(1)} MW`, color: "var(--blue)" },
            { label: "Reactive Power", value: `${r.reactive_power_kvar?.toFixed(0)} kVAR`, color: "var(--cyan)" },
            { label: "Commissioned", value: sub.commissioned, color: "var(--text-dim)" },
            { label: "Capacity", value: `${sub.capacity_mva} MVA`, color: "var(--text-dim)" },
          ].map(d => (
            <div key={d.label} style={{ background: "var(--bg2)", borderRadius: 6, padding: "6px 8px" }}>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>{d.label}</div>
              <div style={{ fontWeight: 600, color: d.color }}>{d.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Monitoring({ substationData }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [sortBy, setSortBy] = useState("risk");

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    Object.values(substationData || {}).forEach(d => { if (c[d.severity] !== undefined) c[d.severity]++; });
    return c;
  }, [substationData]);

  const gridMetrics = useMemo(() => {
    const active = Object.values(substationData || {});
    const anomalyCount = active.filter(z => z.is_anomaly).length;
    const healthyCount = active.filter(z => z.severity === "low").length;
    const avgLoad = active.length
      ? (active.reduce((s, z) => s + (z.sensor_readings?.load_percent || 0), 0) / active.length).toFixed(1)
      : 0;
    const avgTemp = active.length
      ? (active.reduce((s, z) => s + (z.sensor_readings?.transformer_temp_c || 0), 0) / active.length).toFixed(1)
      : 0;
    return { anomalyCount, healthyCount, avgLoad, avgTemp };
  }, [substationData]);

  const filtered = useMemo(() => {
    let list = SUBSTATIONS.filter(sub => {
      const data = substationData?.[sub.id];
      if (!data) return false;
      const matchSearch = !search || sub.name.toLowerCase().includes(search.toLowerCase()) || sub.area.toLowerCase().includes(search.toLowerCase());
      const matchSev = filterSev === "all" || data.severity === filterSev;
      return matchSearch && matchSev;
    });

    if (sortBy === "risk") list = list.sort((a, b) => (substationData?.[b.id]?.failure_probability || 0) - (substationData?.[a.id]?.failure_probability || 0));
    else if (sortBy === "load") list = list.sort((a, b) => (substationData?.[b.id]?.sensor_readings?.load_percent || 0) - (substationData?.[a.id]?.sensor_readings?.load_percent || 0));
    else if (sortBy === "name") list = list.sort((a, b) => a.shortName.localeCompare(b.shortName));

    return list;
  }, [substationData, search, filterSev, sortBy]);

  return (
    <div className="animate-fade">
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={18} color="var(--cyan)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Power Infrastructure Monitoring</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          BESCOM Bangalore — Live sensor readings · Click a card to expand details
        </p>
      </div>

      {/* summary stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Substations Online"  value={SUBSTATIONS.length}          unit="active"                    color="var(--blue)"  icon={Zap}           sub="BESCOM network"      animDelay={0} />
        <StatCard label="Anomalies Detected"  value={gridMetrics.anomalyCount}    unit="faults"                    color={gridMetrics.anomalyCount > 0 ? "var(--red)" : "var(--green)"} icon={AlertTriangle} sub={gridMetrics.anomalyCount > 0 ? "Needs attention" : "All clear"} animDelay={0.05} />
        <StatCard label="Avg Grid Load"       value={gridMetrics.avgLoad}         unit="%"                         color="var(--amber)" icon={Activity}      sub="Across all zones"    animDelay={0.1} />
        <StatCard label="Avg Transformer"     value={gridMetrics.avgTemp}         unit="°C"                        color="var(--cyan)"  icon={Thermometer}   sub="Temperature"         animDelay={0.15} />
        <StatCard label="Healthy Substations" value={gridMetrics.healthyCount}    unit={`/ ${SUBSTATIONS.length}`} color="var(--green)" icon={Shield}        sub="Operating normally"  animDelay={0.2} />
      </div>

      {/* summary badges */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(counts).map(([s, c]) => (
          <button
            key={s}
            onClick={() => setFilterSev(filterSev === s ? "all" : s)}
            className={`badge badge-${SEV_CLASS[s]}`}
            style={{ cursor: "pointer", border: filterSev === s ? `1px solid ${SEV_COLOR[s]}` : undefined, padding: "5px 12px" }}
          >
            {SEV_LABEL[s]}: {c}
          </button>
        ))}
      </div>

      {/* search + sort */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input className="input" placeholder="Search substations..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk">Sort: Risk</option>
          <option value="load">Sort: Load</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((sub, i) => (
          <SubstationCard key={sub.id} sub={sub} data={substationData?.[sub.id]} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          No substations match your filters
        </div>
      )}
    </div>
  );
}
