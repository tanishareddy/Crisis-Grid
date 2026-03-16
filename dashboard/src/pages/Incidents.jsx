/**
 * Incident Report Center — automatic history log
 * All incidents are system-generated from simulated faults and detected anomalies.
 * No manual reporting.
 */
import { useState, useMemo } from "react";
import {
  FileText, Search, CheckCircle, Clock, AlertTriangle,
  Zap, Droplets, Flame, Wifi, Building2, ExternalLink,
  ArrowUpDown, Filter,
} from "lucide-react";
import IncidentDetail from "./IncidentDetail";
import { useToast } from "../context/AppContext";

// ── Config ────────────────────────────────────────────────────────────────────
// Status display config: maps incident status → color, label, icon
const STATUS_CFG = {
  open:          { color: "var(--red)",   label: "Active",        icon: AlertTriangle },
  investigating: { color: "var(--amber)", label: "Investigating",  icon: Clock },
  resolved:      { color: "var(--green)", label: "Resolved",       icon: CheckCircle },
};

const SEV_COLOR = {
  critical: "var(--red)",
  high:     "var(--red)",
  medium:   "var(--amber)",
  low:      "var(--green)",
};

const SEV_BADGE = {
  critical: "badge-red",
  high:     "badge-red",
  medium:   "badge-amber",
  low:      "badge-green",
};

const INFRA_CFG = {
  power:          { icon: Zap,       color: "#3A86FF", label: "Power" },
  water:          { icon: Droplets,  color: "#00E5FF", label: "Water" },
  gas:            { icon: Flame,     color: "#f59e0b", label: "Gas" },
  communications: { icon: Wifi,      color: "#a855f7", label: "Comms" },
  physical:       { icon: Building2, color: "#39FF14", label: "Civil" },
};

const SORT_OPTIONS = [
  { value: "newest",   label: "Newest First" },
  { value: "oldest",   label: "Oldest First" },
  { value: "severity", label: "Severity" },
  { value: "risk",     label: "Risk Score" },
];

// ── Incident row card ─────────────────────────────────────────────────────────
// Renders a single incident as a clickable card with:
//  - Left accent bar colored by severity
//  - Infrastructure type icon
//  - Title, severity badge, status pill, NEW badge
//  - Truncated description
//  - Location, risk %, timestamp
//  - Risk progress bar at the bottom
function IncidentRow({ inc, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const stCfg = STATUS_CFG[inc.status] || STATUS_CFG.open;
  const StIcon = stCfg.icon;
  const infra = INFRA_CFG[inc.infraType] || INFRA_CFG.power;
  const InfraIcon = infra.icon;
  const sevColor = SEV_COLOR[inc.severity] || "var(--text-muted)";
  const riskPct = inc.failure_probability != null
    ? Math.round(inc.failure_probability * 100)
    : null;

  return (
    <div
      className="card animate-slide-up"
      style={{
        padding: "14px 18px",
        cursor: "pointer",
        borderColor: hovered ? `${sevColor}44` : inc.isNew ? `${sevColor}22` : "var(--border)",
        boxShadow: hovered ? `0 4px 20px ${sevColor}14` : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "all 0.18s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(inc)}
    >
      {/* left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: sevColor, borderRadius: "12px 0 0 12px",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingLeft: 8 }}>
        {/* Infra icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: `${infra.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}>
          <InfraIcon size={16} color={infra.color} />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: title + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>
              {inc.title || inc.type}
            </span>
            <span className={`badge ${SEV_BADGE[inc.severity] || "badge-blue"}`}>
              {inc.severity?.toUpperCase()}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
              background: `${stCfg.color}18`, color: stCfg.color,
              border: `1px solid ${stCfg.color}33`,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <StIcon size={9} />
              {stCfg.label}
            </span>
            {inc.isNew && (
              <span className="badge badge-blue animate-blink">NEW</span>
            )}
          </div>

          {/* Row 2: description */}
          <div style={{
            fontSize: 12, color: "var(--text-dim)", marginBottom: 8,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {inc.description}
          </div>

          {/* Row 3: meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <InfraIcon size={10} color={infra.color} />
              {infra.label}
            </span>
            {inc.location && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>📍 {inc.location}</span>
            )}
            {riskPct != null && (
              <span style={{ fontSize: 11, color: sevColor, fontWeight: 600 }}>
                Risk: {riskPct}%
              </span>
            )}
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
              {new Date(inc.timestamp).toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* View arrow */}
        <div style={{
          color: "var(--text-muted)", opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s", flexShrink: 0, marginTop: 8,
        }}>
          <ExternalLink size={14} />
        </div>
      </div>

      {/* Risk bar at bottom */}
      {riskPct != null && (
        <div style={{ marginTop: 10, paddingLeft: 8 }}>
          <div style={{ background: "var(--bg)", borderRadius: 4, height: 3, overflow: "hidden" }}>
            <div style={{
              width: `${riskPct}%`, height: "100%",
              background: `linear-gradient(90deg, ${sevColor}88, ${sevColor})`,
              borderRadius: 4, transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary stat pill ─────────────────────────────────────────────────────────
function SummaryPill({ icon: Icon, color, count, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 14px",
      background: `${color}0e`,
      border: `1px solid ${color}33`,
      borderRadius: 20, fontSize: 12,
    }}>
      <Icon size={12} color={color} />
      <span style={{ color, fontWeight: 700 }}>{count}</span>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// Props:
//   incidents        — full incident array from App.jsx state
//   onUpdate(id, {}) — partial update callback (e.g. status change, isNew clear)
//   initialIncidentId — if set, opens that incident's detail view immediately
//                       (used for deep-linking from toast notifications)
export default function Incidents({ incidents = [], onUpdate, initialIncidentId = null }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterInfra, setFilterInfra] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [detailIncident, setDetailIncident] = useState(
    initialIncidentId ? incidents.find(i => i.id === initialIncidentId) || null : null
  );
  const { addToast } = useToast();

  // Clear the NEW badge when an incident is opened
  const handleOpen = (inc) => {
    if (inc.isNew) onUpdate?.(inc.id, { isNew: false });
    setDetailIncident(inc);
  };

  const handleBack = () => setDetailIncident(null);

  const handleUpdate = (id, updates) => {
    onUpdate?.(id, updates);
    setDetailIncident(prev => prev?.id === id ? { ...prev, ...updates } : prev);
    addToast("Incident updated", "success");
  };

  // Severity sort order: critical first, low last
  const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

  // Apply all active filters and the selected sort order
  const filtered = useMemo(() => {
    let list = incidents.filter(inc => {
      const matchSearch = !search ||
        inc.title?.toLowerCase().includes(search.toLowerCase()) ||
        inc.type?.toLowerCase().includes(search.toLowerCase()) ||
        inc.description?.toLowerCase().includes(search.toLowerCase()) ||
        inc.location?.toLowerCase().includes(search.toLowerCase());
      const matchSev    = filterSev    === "all" || inc.severity  === filterSev;
      const matchStatus = filterStatus === "all" || inc.status    === filterStatus;
      const matchInfra  = filterInfra  === "all" || inc.infraType === filterInfra;
      return matchSearch && matchSev && matchStatus && matchInfra;
    });

    switch (sortBy) {
      case "oldest":   list = [...list].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); break;
      case "severity": list = [...list].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)); break;
      case "risk":     list = [...list].sort((a, b) => (b.failure_probability ?? 0) - (a.failure_probability ?? 0)); break;
      default:         list = [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); break;
    }
    return list;
  }, [incidents, search, filterSev, filterStatus, filterInfra, sortBy]);

  // ── Detail view ──
  if (detailIncident) {
    const latest = incidents.find(i => i.id === detailIncident.id) || detailIncident;
    return <IncidentDetail incident={latest} onBack={handleBack} onUpdate={handleUpdate} />;
  }

  const openCount     = incidents.filter(i => i.status === "open").length;
  const resolvedCount = incidents.filter(i => i.status === "resolved").length;
  const criticalCount = incidents.filter(i => i.severity === "critical" || i.severity === "high").length;

  // ── List view ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg, var(--red), #c0392b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 14px rgba(239,68,68,0.25)",
            }}>
              <FileText size={17} color="#fff" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Incident Report Center</h2>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 44 }}>
            Auto-generated from system faults and anomaly detection · {incidents.length} total incidents
          </p>
        </div>

        {/* Live indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 14px",
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 20, fontSize: 11,
        }}>
          <span className="live-dot" />
          <span style={{ color: "var(--green)", fontWeight: 600 }}>AUTO-LOGGING</span>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SummaryPill icon={AlertTriangle} color="var(--red)"   count={openCount}     label="Active" />
        <SummaryPill icon={Clock}         color="var(--amber)" count={incidents.filter(i => i.status === "investigating").length} label="Investigating" />
        <SummaryPill icon={CheckCircle}   color="var(--green)" count={resolvedCount}  label="Resolved" />
        <SummaryPill icon={Zap}           color="var(--red)"   count={criticalCount}  label="Critical / High" />
      </div>

      {/* Filters + sort */}
      <div style={{
        background: "var(--panel)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "14px 16px",
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <Filter size={13} color="var(--text-muted)" />

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={12} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="input"
            placeholder="Search incidents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 28, fontSize: 12 }}
          />
        </div>

        {/* Infrastructure filter */}
        <select className="select" value={filterInfra} onChange={e => setFilterInfra(e.target.value)} style={{ fontSize: 12 }}>
          <option value="all">All Infrastructure</option>
          {Object.entries(INFRA_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Severity filter */}
        <select className="select" value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ fontSize: 12 }}>
          <option value="all">All Severities</option>
          {["critical", "high", "medium", "low"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Status filter */}
        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 12 }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowUpDown size={12} color="var(--text-muted)" />
          <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 12 }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Result count */}
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} of {incidents.length}
        </span>
      </div>

      {/* Incident list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <FileText size={36} color="var(--text-muted)" style={{ display: "block", margin: "0 auto 14px" }} />
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 6 }}>
            {incidents.length === 0
              ? "No incidents logged yet"
              : "No incidents match your filters"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {incidents.length === 0
              ? "Incidents are automatically created when faults are detected or simulated."
              : "Try adjusting your filters."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(inc => (
            <IncidentRow key={inc.id} inc={inc} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
