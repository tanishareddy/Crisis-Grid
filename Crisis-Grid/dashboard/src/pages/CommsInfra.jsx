/**
 * CommsInfra — Communications Infrastructure monitoring page.
 * Layout mirrors the Power (Monitoring) page — asset card grid, no map.
 */
import { useState, useMemo } from "react";
import { Radio, Signal, Activity, AlertTriangle, Search, Wifi } from "lucide-react";
import StatCard from "../components/StatCard";
import { COMMS_ASSETS } from "../data/smartCityData";

const SEV_COLOR = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)", critical: "var(--red)" };
const SEV_LABEL = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" };
const SEV_CLASS = { low: "green", medium: "amber", high: "red", critical: "red" };

function commsSeverity(reading) {
  if (!reading) return "low";
  if (reading.backhaulStatus === "offline") return "critical";
  if (reading.uptimePct < 95 || reading.backhaulStatus === "degraded") return "medium";
  return "low";
}

function commsRisk(reading) {
  if (!reading) return 0;
  let risk = 0;
  if (reading.backhaulStatus === "offline") risk += 60;
  else if (reading.backhaulStatus === "degraded") risk += 25;
  if (reading.uptimePct < 95) risk += 30;
  else if (reading.uptimePct < 98) risk += 10;
  if (reading.signalDbm < -80) risk += 10;
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

function CommsAssetCard({ asset, reading, index }) {
  const [expanded, setExpanded] = useState(false);
  if (!reading) return null;
  const sev = commsSeverity(reading);
  const risk = commsRisk(reading);
  const color = SEV_COLOR[sev];
  const isCritical = sev === "critical";
  // Normalise signal: -90 dBm = 0%, -50 dBm = 100%
  const signalPct = Math.min(Math.max(((reading.signalDbm + 90) / 40) * 100, 0), 100);

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
            <Radio size={13} color={color} />
            {asset.shortName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {asset.zone} · {asset.assetId.split("_")[1]}
          </div>
          <div style={{ fontSize: 11, marginTop: 3, fontWeight: isCritical ? 600 : 400, color: isCritical ? color : "var(--text-muted)" }}>
            {reading.backhaulStatus === "offline" ? "⚠ BACKHAUL OFFLINE" : reading.backhaulStatus === "degraded" ? "Backhaul degraded" : "Operating normally"}
          </div>
        </div>
        <span className={`badge badge-${SEV_CLASS[sev]}`}>{SEV_LABEL[sev]}</span>
      </div>

      {/* metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Signal",      value: reading.signalDbm?.toFixed(1),    unit: "dBm",  max: 100, pct: signalPct,                    icon: Signal,        col: reading.signalDbm < -80 ? "var(--red)" : reading.signalDbm < -70 ? "var(--amber)" : "var(--green)" },
          { label: "Uptime",      value: reading.uptimePct?.toFixed(2),    unit: "%",    max: 100, pct: reading.uptimePct,             icon: Activity,      col: reading.uptimePct < 95 ? "var(--red)" : "var(--green)" },
          { label: "Connections", value: reading.activeConnections,        unit: "",     max: 500, pct: (reading.activeConnections / 500) * 100, icon: Wifi, col: "var(--blue)" },
          { label: "Backhaul",    value: reading.backhaulStatus,           unit: "",     max: 1,   pct: null,                          icon: Radio,         col: reading.backhaulStatus === "online" ? "var(--green)" : reading.backhaulStatus === "degraded" ? "var(--amber)" : "var(--red)" },
        ].map(m => (
          <div key={m.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
              <m.icon size={10} color={m.col} />{m.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: m.col, minWidth: 48 }}>
                {m.value}<span style={{ fontSize: 9, color: "var(--text-muted)" }}> {m.unit}</span>
              </span>
              {m.pct !== null && <Meter value={m.pct} max={100} color={m.col} />}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 8, fontSize: 11 }}>
        <span style={{ color: "var(--text-muted)" }}>
          Status: <strong style={{ color: reading.status === "online" ? "var(--green)" : reading.status === "warning" ? "var(--amber)" : "var(--red)" }}>{reading.status?.toUpperCase()}</strong>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          Risk: <strong style={{ color }}>{risk}%</strong>
        </span>
      </div>

      {expanded && (
        <div className="animate-fade-fast" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          {[
            { label: "Asset ID",    value: asset.assetId,                          color: "var(--text-dim)" },
            { label: "Zone",        value: asset.zone,                             color: "var(--purple)" },
            { label: "Signal",      value: `${reading.signalDbm} dBm`,             color: reading.signalDbm < -80 ? "var(--red)" : "var(--green)" },
            { label: "Uptime",      value: `${reading.uptimePct}%`,                color: reading.uptimePct < 95 ? "var(--red)" : "var(--green)" },
            { label: "Connections", value: reading.activeConnections,              color: "var(--blue)" },
            { label: "Backhaul",    value: reading.backhaulStatus?.toUpperCase(),  color: reading.backhaulStatus === "online" ? "var(--green)" : "var(--red)" },
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

export default function CommsInfra({ infraData }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [sortBy, setSortBy] = useState("risk");

  const readingsObj = useMemo(() => {
    const obj = {};
    infraData.forEach((val, key) => { obj[key] = val; });
    return obj;
  }, [infraData]);

  const metrics = useMemo(() => {
    let nodesOnline = 0, degradedSignal = 0, activeOutages = 0, totalUptime = 0, uptimeCount = 0;
    for (const asset of COMMS_ASSETS) {
      const r = infraData.get(asset.assetId);
      if (!r) continue;
      if (r.backhaulStatus !== "offline") nodesOnline++;
      if (r.uptimePct < 95 || r.backhaulStatus === "degraded") degradedSignal++;
      if (r.backhaulStatus === "offline") activeOutages++;
      if (typeof r.uptimePct === "number") { totalUptime += r.uptimePct; uptimeCount++; }
    }
    return {
      total: COMMS_ASSETS.length,
      nodesOnline,
      degradedSignal,
      activeOutages,
      avgUptime: uptimeCount > 0 ? (totalUptime / uptimeCount).toFixed(1) : "—",
    };
  }, [infraData]);

  const counts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0, critical: 0 };
    COMMS_ASSETS.forEach(a => { const s = commsSeverity(readingsObj[a.assetId]); c[s]++; });
    return c;
  }, [readingsObj]);

  const filtered = useMemo(() => {
    let list = COMMS_ASSETS.filter(asset => {
      const r = readingsObj[asset.assetId];
      if (!r) return false;
      const matchSearch = !search || asset.name.toLowerCase().includes(search.toLowerCase()) || asset.zone.toLowerCase().includes(search.toLowerCase());
      const matchSev = filterSev === "all" || commsSeverity(r) === filterSev;
      return matchSearch && matchSev;
    });
    if (sortBy === "risk") list = list.sort((a, b) => commsRisk(readingsObj[b.assetId]) - commsRisk(readingsObj[a.assetId]));
    else if (sortBy === "uptime") list = list.sort((a, b) => (readingsObj[a.assetId]?.uptimePct || 0) - (readingsObj[b.assetId]?.uptimePct || 0));
    else if (sortBy === "name") list = list.sort((a, b) => a.shortName.localeCompare(b.shortName));
    return list;
  }, [readingsObj, search, filterSev, sortBy]);

  return (
    <div className="animate-fade">
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={18} color="var(--purple)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Communications Infrastructure</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Bangalore Communications Network — Live sensor monitoring across 7 zones · Click a card to expand
        </p>
      </div>

      {/* stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard label="Nodes Online"          value={metrics.nodesOnline}    icon={Activity}      color="var(--purple)"  animDelay={0} />
        <StatCard label="Degraded Signal"        value={metrics.degradedSignal} icon={Signal}        color={metrics.degradedSignal > 0 ? "var(--amber)" : "var(--green)"} animDelay={0.05} />
        <StatCard label="Avg Uptime"             value={metrics.avgUptime}      unit="%" icon={Radio} color="var(--purple)" animDelay={0.1} />
        <StatCard label="Active Outages"         value={metrics.activeOutages}  icon={AlertTriangle} color={metrics.activeOutages > 0 ? "var(--red)" : "var(--green)"} animDelay={0.15} />
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
          <input className="input" placeholder="Search comms assets..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk">Sort: Risk</option>
          <option value="uptime">Sort: Uptime (low first)</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* asset grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((asset, i) => (
          <CommsAssetCard key={asset.assetId} asset={asset} reading={readingsObj[asset.assetId]} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          No comms assets match your filters
        </div>
      )}
    </div>
  );
}
