/**
 * GasInfra — Gas / LPG Infrastructure monitoring page.
 * Layout mirrors the Power (Monitoring) page — asset card grid, no map.
 */
import { useState, useMemo } from "react";
import { Flame, Gauge, AlertTriangle, Activity, Search } from "lucide-react";
import StatCard from "../components/StatCard";
import { GAS_ASSETS } from "../data/smartCityData";

const SEV_COLOR = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)", critical: "var(--red)" };
const SEV_LABEL = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" };
const SEV_CLASS = { low: "green", medium: "amber", high: "red", critical: "red" };

function gasSeverity(reading) {
  if (!reading) return "low";
  if (reading.leakPpm > 50) return "critical";
  const nominal = reading.nominalPressureBar;
  if (nominal && Math.abs(reading.outletPressureBar - nominal) / nominal > 0.20) return "high";
  return "low";
}

function gasRisk(reading) {
  if (!reading) return 0;
  let risk = 0;
  if (reading.leakPpm > 50) risk += 60;
  else if (reading.leakPpm > 20) risk += 20;
  const nominal = reading.nominalPressureBar;
  if (nominal) {
    const dev = Math.abs(reading.outletPressureBar - nominal) / nominal;
    if (dev > 0.20) risk += 35;
    else if (dev > 0.10) risk += 15;
  }
  if (reading.valveStatus === "partial") risk += 5;
  return Math.min(risk, 100);
}

function Meter({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar" style={{ flex: 1 }}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function GasAssetCard({ asset, reading, index }) {
  const [expanded, setExpanded] = useState(false);
  if (!reading) return null;
  const sev = gasSeverity(reading);
  const risk = gasRisk(reading);
  const color = SEV_COLOR[sev];
  const isCritical = sev === "critical";
  const dev = reading.nominalPressureBar
    ? Math.abs(reading.outletPressureBar - reading.nominalPressureBar) / reading.nominalPressureBar
    : 0;

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
            <Flame size={13} color={color} />
            {asset.shortName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {asset.zone} · {asset.assetId.split("_")[1]}
          </div>
          <div style={{ fontSize: 11, marginTop: 3, fontWeight: isCritical ? 600 : 400, color: isCritical ? color : "var(--text-muted)" }}>
            {reading.leakPpm > 50 ? "⚠ GAS LEAK DETECTED" : dev > 0.20 ? "Pressure anomaly" : "Operating normally"}
          </div>
        </div>
        <span className={`badge badge-${SEV_CLASS[sev]}`}>{SEV_LABEL[sev]}</span>
      </div>

      {/* metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Outlet Pressure", value: reading.outletPressureBar?.toFixed(2), unit: "bar", max: 10, icon: Gauge, col: dev > 0.20 ? "var(--red)" : "var(--amber)" },
          { label: "Flow",            value: reading.flowM3h?.toFixed(1),            unit: "m³/h", max: 500, icon: Activity, col: "var(--blue)" },
          { label: "Leak (ppm)",      value: reading.leakPpm?.toFixed(1),            unit: "ppm", max: 200, icon: AlertTriangle, col: reading.leakPpm > 50 ? "var(--red)" : reading.leakPpm > 20 ? "var(--amber)" : "var(--green)" },
          { label: "Inlet Pressure",  value: reading.inletPressureBar?.toFixed(2),   unit: "bar", max: 12, icon: Gauge, col: "var(--cyan)" },
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

      {/* footer */}
      <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 8, fontSize: 11 }}>
        <span style={{ color: "var(--text-muted)" }}>
          Valve: <strong style={{ color: reading.valveStatus === "open" ? "var(--green)" : "var(--amber)" }}>{reading.valveStatus?.toUpperCase()}</strong>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          Nominal: <strong style={{ color: "var(--cyan)" }}>{reading.nominalPressureBar} bar</strong>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          Risk: <strong style={{ color }}>{risk}%</strong>
        </span>
      </div>

      {expanded && (
        <div className="animate-fade-fast" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          {[
            { label: "Asset ID",       value: asset.assetId,                          color: "var(--text-dim)" },
            { label: "Zone",           value: asset.zone,                             color: "var(--amber)" },
            { label: "Inlet Pressure", value: `${reading.inletPressureBar} bar`,      color: "var(--cyan)" },
            { label: "Outlet Pressure",value: `${reading.outletPressureBar} bar`,     color: dev > 0.20 ? "var(--red)" : "var(--green)" },
            { label: "Pressure Dev",   value: `${(dev * 100).toFixed(1)}%`,           color: dev > 0.20 ? "var(--red)" : "var(--green)" },
            { label: "Leak (ppm)",     value: `${reading.leakPpm} ppm`,               color: reading.leakPpm > 50 ? "var(--red)" : "var(--green)" },
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

export default function GasInfra({ infraData }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [sortBy, setSortBy] = useState("risk");

  const readingsObj = useMemo(() => {
    const obj = {};
    infraData.forEach((val, key) => { obj[key] = val; });
    return obj;
  }, [infraData]);

  const metrics = useMemo(() => {
    let pressureAnomalies = 0, leakAlerts = 0, totalPressure = 0, pressureCount = 0;
    for (const asset of GAS_ASSETS) {
      const r = infraData.get(asset.assetId);
      if (!r) continue;
      const nominal = r.nominalPressureBar;
      if (nominal && Math.abs(r.outletPressureBar - nominal) / nominal > 0.20) pressureAnomalies++;
      if (r.leakPpm > 50) leakAlerts++;
      if (typeof r.outletPressureBar === "number") { totalPressure += r.outletPressureBar; pressureCount++; }
    }
    return {
      total: GAS_ASSETS.length,
      pressureAnomalies,
      leakAlerts,
      avgPressure: pressureCount > 0 ? (totalPressure / pressureCount).toFixed(2) : "—",
    };
  }, [infraData]);

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    GAS_ASSETS.forEach(a => { const s = gasSeverity(readingsObj[a.assetId]); c[s]++; });
    return c;
  }, [readingsObj]);

  const filtered = useMemo(() => {
    let list = GAS_ASSETS.filter(asset => {
      const r = readingsObj[asset.assetId];
      if (!r) return false;
      const matchSearch = !search || asset.name.toLowerCase().includes(search.toLowerCase()) || asset.zone.toLowerCase().includes(search.toLowerCase());
      const matchSev = filterSev === "all" || gasSeverity(r) === filterSev;
      return matchSearch && matchSev;
    });
    if (sortBy === "risk") list = list.sort((a, b) => gasRisk(readingsObj[b.assetId]) - gasRisk(readingsObj[a.assetId]));
    else if (sortBy === "leak") list = list.sort((a, b) => (readingsObj[b.assetId]?.leakPpm || 0) - (readingsObj[a.assetId]?.leakPpm || 0));
    else if (sortBy === "name") list = list.sort((a, b) => a.shortName.localeCompare(b.shortName));
    return list;
  }, [readingsObj, search, filterSev, sortBy]);

  return (
    <div className="animate-fade">
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flame size={18} color="var(--amber)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Gas Infrastructure</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Bangalore Gas Distribution Network — Live sensor monitoring across 7 zones · Click a card to expand
        </p>
      </div>

      {/* stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Pipeline Segments"        value={metrics.total}             icon={Activity}      color="var(--amber)"  animDelay={0} />
        <StatCard label="Pressure Anomalies"       value={metrics.pressureAnomalies} icon={Gauge}         color={metrics.pressureAnomalies > 0 ? "var(--amber)" : "var(--green)"} animDelay={0.05} />
        <StatCard label="Avg Distribution Pressure" value={metrics.avgPressure}      unit="bar" icon={Flame} color="var(--amber)" animDelay={0.1} />
        <StatCard label="Leak Alerts"              value={metrics.leakAlerts}        icon={AlertTriangle} color={metrics.leakAlerts > 0 ? "var(--red)" : "var(--green)"} animDelay={0.15} />
      </div>

      {/* severity filter badges */}
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
          <input className="input" placeholder="Search gas assets..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk">Sort: Risk</option>
          <option value="leak">Sort: Leak (ppm)</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* asset grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((asset, i) => (
          <GasAssetCard key={asset.assetId} asset={asset} reading={readingsObj[asset.assetId]} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          No gas assets match your filters
        </div>
      )}
    </div>
  );
}
