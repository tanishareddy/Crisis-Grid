/**
 * WaterInfra — Water Infrastructure monitoring page.
 * Layout mirrors the Power (Monitoring) page — asset card grid, no map.
 */
import { useState, useMemo } from "react";
import { Droplets, Gauge, Activity, AlertTriangle, Search, Heart } from "lucide-react";
import StatCard from "../components/StatCard";
import { WATER_ASSETS } from "../data/smartCityData";

const SEV_COLOR = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)", critical: "var(--red)" };
const SEV_LABEL = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" };
const SEV_CLASS = { low: "green", medium: "amber", high: "red", critical: "red" };

/** Derive risk severity from a water reading */
function waterSeverity(reading) {
  if (!reading) return "low";
  if (reading.pressureBar < 1.5) return "high";
  if (reading.pumpHealthScore < 40) return "medium";
  return "low";
}

/** Risk % heuristic for water assets */
function waterRisk(reading) {
  if (!reading) return 0;
  let risk = 0;
  if (reading.pressureBar < 1.5) risk += 50;
  else if (reading.pressureBar < 2.5) risk += 20;
  if (reading.pumpHealthScore < 40) risk += 40;
  else if (reading.pumpHealthScore < 60) risk += 15;
  if (reading.leakDetected) risk += 10;
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

function WaterAssetCard({ asset, reading, index }) {
  const [expanded, setExpanded] = useState(false);
  if (!reading) return null;
  const sev = waterSeverity(reading);
  const risk = waterRisk(reading);
  const color = SEV_COLOR[sev];

  return (
    <div
      className="card animate-slide-up"
      style={{
        padding: 16,
        borderColor: `${color}44`,
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
            <Droplets size={13} color={color} />
            {asset.shortName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {asset.zone} · {asset.assetId.split("_")[1]}
          </div>
          <div style={{ fontSize: 11, marginTop: 3, color: reading.leakDetected ? "var(--red)" : "var(--text-muted)" }}>
            {reading.leakDetected ? "⚠ LEAK DETECTED" : reading.status === "warning" ? "Pressure / pump warning" : "Operating normally"}
          </div>
        </div>
        <span className={`badge badge-${SEV_CLASS[sev]}`}>{SEV_LABEL[sev]}</span>
      </div>

      {/* metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Pressure", value: reading.pressureBar?.toFixed(2), unit: "bar", max: 8, icon: Gauge, col: reading.pressureBar < 1.5 ? "var(--red)" : "var(--cyan)" },
          { label: "Flow",     value: reading.flowLps?.toFixed(1),     unit: "L/s", max: 100, icon: Activity, col: "var(--blue)" },
          { label: "Pump Health", value: reading.pumpHealthScore,      unit: "/100", max: 100, icon: Heart, col: reading.pumpHealthScore < 40 ? "var(--red)" : reading.pumpHealthScore < 60 ? "var(--amber)" : "var(--green)" },
          { label: "Leak",     value: reading.leakDetected ? "YES" : "NO", unit: "", max: 1, icon: AlertTriangle, col: reading.leakDetected ? "var(--red)" : "var(--green)" },
        ].map(m => (
          <div key={m.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
              <m.icon size={10} color={m.col} />{m.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: m.col, minWidth: 48 }}>
                {m.value}<span style={{ fontSize: 9, color: "var(--text-muted)" }}> {m.unit}</span>
              </span>
              {m.label !== "Leak" && <Meter value={parseFloat(m.value)} max={m.max} color={m.col} />}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 8, fontSize: 11 }}>
        <span style={{ color: "var(--text-muted)" }}>
          Status: <strong style={{ color: reading.status === "online" ? "var(--green)" : "var(--amber)" }}>{reading.status?.toUpperCase()}</strong>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          Risk: <strong style={{ color }}>{risk}%</strong>
        </span>
      </div>

      {expanded && (
        <div className="animate-fade-fast" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          {[
            { label: "Asset ID",    value: asset.assetId,                    color: "var(--text-dim)" },
            { label: "Zone",        value: asset.zone,                       color: "var(--cyan)" },
            { label: "Pressure",    value: `${reading.pressureBar} bar`,     color: reading.pressureBar < 1.5 ? "var(--red)" : "var(--green)" },
            { label: "Flow Rate",   value: `${reading.flowLps} L/s`,         color: "var(--blue)" },
            { label: "Pump Health", value: `${reading.pumpHealthScore}/100`, color: reading.pumpHealthScore < 40 ? "var(--red)" : "var(--green)" },
            { label: "Leak",        value: reading.leakDetected ? "YES" : "NO", color: reading.leakDetected ? "var(--red)" : "var(--green)" },
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

export default function WaterInfra({ infraData }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [sortBy, setSortBy] = useState("risk");

  const readingsObj = useMemo(() => {
    const obj = {};
    infraData.forEach((val, key) => { obj[key] = val; });
    return obj;
  }, [infraData]);

  const metrics = useMemo(() => {
    let pumpOnline = 0, activeLeaks = 0, totalPressure = 0, pressureCount = 0;
    for (const asset of WATER_ASSETS) {
      const r = infraData.get(asset.assetId);
      if (!r) continue;
      if (r.status !== "critical" && r.status !== "offline") pumpOnline++;
      if (r.pressureBar < 1.5) activeLeaks++;
      if (typeof r.pressureBar === "number") { totalPressure += r.pressureBar; pressureCount++; }
    }
    return {
      pumpOnline,
      activeLeaks,
      avgPressure: pressureCount > 0 ? (totalPressure / pressureCount).toFixed(2) : "—",
      total: WATER_ASSETS.length,
    };
  }, [infraData]);

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    WATER_ASSETS.forEach(a => {
      const r = infraData.get(a.assetId);
      const s = waterSeverity(r);
      c[s]++;
    });
    return c;
  }, [infraData]);

  const filtered = useMemo(() => {
    let list = WATER_ASSETS.filter(asset => {
      const r = readingsObj[asset.assetId];
      if (!r) return false;
      const matchSearch = !search || asset.name.toLowerCase().includes(search.toLowerCase()) || asset.zone.toLowerCase().includes(search.toLowerCase());
      const matchSev = filterSev === "all" || waterSeverity(r) === filterSev;
      return matchSearch && matchSev;
    });
    if (sortBy === "risk") list = list.sort((a, b) => waterRisk(readingsObj[b.assetId]) - waterRisk(readingsObj[a.assetId]));
    else if (sortBy === "pressure") list = list.sort((a, b) => (readingsObj[a.assetId]?.pressureBar || 0) - (readingsObj[b.assetId]?.pressureBar || 0));
    else if (sortBy === "name") list = list.sort((a, b) => a.shortName.localeCompare(b.shortName));
    return list;
  }, [readingsObj, search, filterSev, sortBy]);

  return (
    <div className="animate-fade">
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Droplets size={18} color="var(--cyan)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Water Infrastructure</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Bangalore Water Supply Board — Live sensor monitoring across 7 zones · Click a card to expand
        </p>
      </div>

      {/* stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Assets Monitored"      value={metrics.total}       icon={Activity}      color="var(--cyan)"  animDelay={0} />
        <StatCard label="Pump Stations Online"  value={metrics.pumpOnline}  icon={Droplets}      color="var(--green)" animDelay={0.05} />
        <StatCard label="Avg Network Pressure"  value={metrics.avgPressure} unit="bar" icon={Gauge} color="var(--blue)" animDelay={0.1} />
        <StatCard label="Active Leaks Detected" value={metrics.activeLeaks} icon={AlertTriangle}  color={metrics.activeLeaks > 0 ? "var(--red)" : "var(--green)"} animDelay={0.15} />
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
          <input className="input" placeholder="Search water assets..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk">Sort: Risk</option>
          <option value="pressure">Sort: Pressure (low first)</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* asset grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((asset, i) => (
          <WaterAssetCard key={asset.assetId} asset={asset} reading={readingsObj[asset.assetId]} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          No water assets match your filters
        </div>
      )}
    </div>
  );
}
