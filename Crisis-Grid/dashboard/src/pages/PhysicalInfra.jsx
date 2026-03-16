/**
 * PhysicalInfra — Physical / Civil Infrastructure monitoring page.
 * Layout mirrors the Power (Monitoring) page — asset card grid, no map.
 */
import { useState, useMemo } from "react";
import { Building2, ShieldAlert, Activity, AlertTriangle, Search, Gauge } from "lucide-react";
import StatCard from "../components/StatCard";
import { PHYSICAL_ASSETS } from "../data/smartCityData";

const SEV_COLOR = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)", critical: "var(--red)" };
const SEV_LABEL = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" };
const SEV_CLASS = { low: "green", medium: "amber", high: "red", critical: "red" };

function physicalSeverity(reading) {
  if (!reading) return "low";
  if (reading.structuralHealthScore < 25) return "critical";
  if (reading.structuralHealthScore < 50) return "high";
  return "low";
}

function physicalRisk(reading) {
  if (!reading) return 0;
  let risk = 0;
  const score = reading.structuralHealthScore;
  if (score < 25) risk += 70;
  else if (score < 50) risk += 40;
  else if (score < 70) risk += 15;
  if (reading.vibrationMms > 2.5) risk += 20;
  else if (reading.vibrationMms > 1.5) risk += 10;
  if (reading.tiltDegrees > 1.5) risk += 10;
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

function PhysicalAssetCard({ asset, reading, index }) {
  const [expanded, setExpanded] = useState(false);
  if (!reading) return null;
  const sev = physicalSeverity(reading);
  const risk = physicalRisk(reading);
  const color = SEV_COLOR[sev];
  const isCritical = sev === "critical";

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
            <Building2 size={13} color={color} />
            {asset.shortName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {asset.zone} · {asset.assetId.split("_")[1]}
          </div>
          <div style={{ fontSize: 11, marginTop: 3, fontWeight: isCritical ? 600 : 400, color: isCritical ? color : "var(--text-muted)" }}>
            {reading.structuralHealthScore < 25 ? "⚠ CRITICAL STRUCTURAL DAMAGE"
              : reading.structuralHealthScore < 50 ? "Structural health warning"
              : "Structurally sound"}
          </div>
        </div>
        <span className={`badge badge-${SEV_CLASS[sev]}`}>{SEV_LABEL[sev]}</span>
      </div>

      {/* metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Health Score", value: reading.structuralHealthScore, unit: "/100", max: 100, icon: ShieldAlert, col: reading.structuralHealthScore < 25 ? "var(--red)" : reading.structuralHealthScore < 50 ? "var(--amber)" : "var(--green)" },
          { label: "Vibration",    value: reading.vibrationMms?.toFixed(2), unit: "mm/s", max: 8, icon: Activity, col: reading.vibrationMms > 2.5 ? "var(--red)" : reading.vibrationMms > 1.5 ? "var(--amber)" : "var(--green)" },
          { label: "Tilt",         value: reading.tiltDegrees?.toFixed(2),  unit: "°",    max: 5, icon: Gauge,    col: reading.tiltDegrees > 1.5 ? "var(--amber)" : "var(--green)" },
          { label: "Status",       value: reading.status,                   unit: "",     max: 1, icon: AlertTriangle, col: reading.status === "online" ? "var(--green)" : reading.status === "warning" ? "var(--amber)" : "var(--red)" },
        ].map(m => (
          <div key={m.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
              <m.icon size={10} color={m.col} />{m.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: m.col, minWidth: 48 }}>
                {m.value}<span style={{ fontSize: 9, color: "var(--text-muted)" }}> {m.unit}</span>
              </span>
              {m.label !== "Status" && <Meter value={parseFloat(m.value)} max={m.max} color={m.col} />}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 8, fontSize: 11 }}>
        <span style={{ color: "var(--text-muted)" }}>
          Last Inspection: <strong style={{ color: "var(--cyan)" }}>{reading.lastInspectionDate}</strong>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          Risk: <strong style={{ color }}>{risk}%</strong>
        </span>
      </div>

      {expanded && (
        <div className="animate-fade-fast" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          {[
            { label: "Asset ID",       value: asset.assetId,                              color: "var(--text-dim)" },
            { label: "Zone",           value: asset.zone,                                 color: "var(--green)" },
            { label: "Health Score",   value: `${reading.structuralHealthScore}/100`,     color: reading.structuralHealthScore < 50 ? "var(--red)" : "var(--green)" },
            { label: "Vibration",      value: `${reading.vibrationMms} mm/s`,             color: reading.vibrationMms > 2.5 ? "var(--red)" : "var(--green)" },
            { label: "Tilt",           value: `${reading.tiltDegrees}°`,                  color: reading.tiltDegrees > 1.5 ? "var(--amber)" : "var(--green)" },
            { label: "Last Inspection",value: reading.lastInspectionDate,                 color: "var(--text-dim)" },
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

export default function PhysicalInfra({ infraData }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [sortBy, setSortBy] = useState("risk");

  const readingsObj = useMemo(() => {
    const obj = {};
    infraData.forEach((val, key) => { obj[key] = val; });
    return obj;
  }, [infraData]);

  const metrics = useMemo(() => {
    let structuralWarnings = 0, criticalAlerts = 0, totalHealth = 0, healthCount = 0;
    for (const asset of PHYSICAL_ASSETS) {
      const r = infraData.get(asset.assetId);
      if (!r) continue;
      const score = r.structuralHealthScore;
      if (typeof score === "number" && score < 50) structuralWarnings++;
      if (typeof score === "number" && score < 25) criticalAlerts++;
      if (typeof score === "number") { totalHealth += score; healthCount++; }
    }
    return {
      total: PHYSICAL_ASSETS.length,
      structuralWarnings,
      criticalAlerts,
      avgHealthScore: healthCount > 0 ? (totalHealth / healthCount).toFixed(1) : "—",
    };
  }, [infraData]);

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    PHYSICAL_ASSETS.forEach(a => { const s = physicalSeverity(readingsObj[a.assetId]); c[s]++; });
    return c;
  }, [readingsObj]);

  const filtered = useMemo(() => {
    let list = PHYSICAL_ASSETS.filter(asset => {
      const r = readingsObj[asset.assetId];
      if (!r) return false;
      const matchSearch = !search || asset.name.toLowerCase().includes(search.toLowerCase()) || asset.zone.toLowerCase().includes(search.toLowerCase());
      const matchSev = filterSev === "all" || physicalSeverity(r) === filterSev;
      return matchSearch && matchSev;
    });
    if (sortBy === "risk") list = list.sort((a, b) => physicalRisk(readingsObj[b.assetId]) - physicalRisk(readingsObj[a.assetId]));
    else if (sortBy === "health") list = list.sort((a, b) => (readingsObj[a.assetId]?.structuralHealthScore || 0) - (readingsObj[b.assetId]?.structuralHealthScore || 0));
    else if (sortBy === "name") list = list.sort((a, b) => a.shortName.localeCompare(b.shortName));
    return list;
  }, [readingsObj, search, filterSev, sortBy]);

  return (
    <div className="animate-fade">
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={18} color="var(--green)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Physical Infrastructure</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Bangalore Structural Monitoring — Live IoT sensor data across 7 zones · Click a card to expand
        </p>
      </div>

      {/* stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Assets Monitored"          value={metrics.total}             icon={Activity}      color="var(--green)"  animDelay={0} />
        <StatCard label="Structural Warnings"        value={metrics.structuralWarnings} icon={AlertTriangle} color={metrics.structuralWarnings > 0 ? "var(--amber)" : "var(--green)"} animDelay={0.05} />
        <StatCard label="Avg Health Score"           value={metrics.avgHealthScore}    icon={Building2}     color="var(--blue)"   animDelay={0.1} />
        <StatCard label="Critical Alerts"            value={metrics.criticalAlerts}    icon={ShieldAlert}   color={metrics.criticalAlerts > 0 ? "var(--red)" : "var(--green)"} animDelay={0.15} />
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
          <input className="input" placeholder="Search physical assets..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk">Sort: Risk</option>
          <option value="health">Sort: Health (low first)</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* asset grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((asset, i) => (
          <PhysicalAssetCard key={asset.assetId} asset={asset} reading={readingsObj[asset.assetId]} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          No physical assets match your filters
        </div>
      )}
    </div>
  );
}
