import { useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, XCircle, Bell, X, ChevronDown, ChevronUp, Filter, ExternalLink } from "lucide-react";

const SEV = {
  critical: { color: "var(--red)",   icon: XCircle,       bg: "var(--red-dim)",   label: "CRITICAL" },
  high:     { color: "var(--red)",   icon: AlertTriangle, bg: "var(--red-dim)",   label: "HIGH" },
  medium:   { color: "var(--amber)", icon: AlertTriangle, bg: "var(--amber-dim)", label: "MEDIUM" },
  low:      { color: "var(--green)", icon: CheckCircle,   bg: "var(--green-dim)", label: "LOW" },
};

function AlertItem({ alert, onDismiss, onNavigate, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cfg = SEV[alert.severity] || SEV.low;
  const Icon = cfg.icon;
  const sub   = alert.substation_id?.replace("SUB_", "").replace(/_/g, " ");
  const fault = alert.fault_type?.replace(/_/g, " ").toUpperCase();
  const time  = alert.sensor_readings?.timestamp
    ? new Date(alert.sensor_readings.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "Now";

  return (
    <div
      className="animate-slide-right"
      style={{
        background: hovered ? `${cfg.color}18` : cfg.bg,
        border: `1px solid ${cfg.color}${hovered ? "66" : "33"}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 6,
        transition: "all 0.18s",
        cursor: "pointer",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate?.(alert)}
    >
      {/* unread dot */}
      {isNew && (
        <span style={{
          position: "absolute", top: 8, right: 8,
          width: 7, height: 7, borderRadius: "50%",
          background: cfg.color, animation: "pulse-red 2s infinite",
        }} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Icon size={14} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{sub}</span>
            <span className={`badge badge-${alert.severity === "critical" || alert.severity === "high" ? "red" : alert.severity === "medium" ? "amber" : "green"}`}>
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{fault}</div>

          {expanded && (
            <div className="animate-fade-fast" style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 6 }}>
              <div>Failure prob: <strong style={{ color: cfg.color }}>{((alert.failure_probability || 0) * 100).toFixed(0)}%</strong></div>
              {alert.decision_support?.citizen_notification && (
                <div style={{ marginTop: 4, fontStyle: "italic" }}>"{alert.decision_support.citizen_notification}"</div>
              )}
              <div style={{ marginTop: 6, color: cfg.color, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <ExternalLink size={11} /> Click to view incident details
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{time}</span>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDismiss?.(alert.substation_id); }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlertPanel({ alerts, onDismiss, onNavigate, newAlertIds = [] }) {
  const [filter, setFilter] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const filtered = (alerts || []).filter(a => filter === "all" || a.severity === filter);
  const critCount = (alerts || []).filter(a => a.severity === "critical" || a.severity === "high").length;

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Bell size={15} color="var(--blue)" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Live Alerts</span>
        {critCount > 0 && (
          <span className="badge badge-red animate-blink">{critCount} critical</span>
        )}
        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 8px", fontSize: 11 }}
            onClick={() => setShowFilter(v => !v)}
          >
            <Filter size={11} /> Filter
          </button>
        </div>
      </div>

      {/* filter pills */}
      {showFilter && (
        <div className="animate-fade-fast" style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {["all", "critical", "high", "medium", "low"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: "1px solid var(--border2)", cursor: "pointer",
                background: filter === f ? "var(--blue)" : "transparent",
                color: filter === f ? "#fff" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* hint */}
      {filtered.length > 0 && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8 }}>
          Click an alert to view incident details →
        </div>
      )}

      {/* list */}
      <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            <CheckCircle size={24} color="var(--green)" style={{ display: "block", margin: "0 auto 8px" }} />
            All systems normal
          </div>
        ) : (
          filtered.map(a => (
            <AlertItem
              key={a.substation_id}
              alert={a}
              onDismiss={onDismiss}
              onNavigate={onNavigate}
              isNew={newAlertIds.includes(a.substation_id)}
            />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "right" }}>
          {filtered.length} alert{filtered.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
