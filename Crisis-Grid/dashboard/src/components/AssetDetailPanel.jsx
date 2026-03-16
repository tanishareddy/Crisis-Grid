/**
 * AssetDetailPanel — slide-in panel showing full sensor readings for a selected asset.
 *
 * Props:
 *   asset     — asset object (base fields from smartCityData.js)
 *   reading   — latest sensor reading object (or falls back to asset fields)
 *   infraType — "water" | "gas" | "communications" | "physical"
 *   onClose   — callback when the panel is dismissed
 */

// ─── Field config lookup table (keyed by infraType) ──────────────────────────
// Each entry: { key, label, unit?, format? }
//   format: "boolean" → "Yes" (red) / "No" (green)
//   unit:   appended after numeric value
//   (default) numeric → 1 decimal place; string → as-is
const FIELD_CONFIGS = {
  water: [
    { key: "pressureBar",     label: "Pressure",         unit: "bar"  },
    { key: "flowLps",         label: "Flow Rate",         unit: "L/s"  },
    { key: "leakDetected",    label: "Leak Detected",     format: "boolean" },
    { key: "pumpHealthScore", label: "Pump Health Score", unit: "/100" },
  ],
  gas: [
    { key: "inletPressureBar",  label: "Inlet Pressure",  unit: "bar"   },
    { key: "outletPressureBar", label: "Outlet Pressure", unit: "bar"   },
    { key: "flowM3h",           label: "Flow Rate",       unit: "m³/h"  },
    { key: "valveStatus",       label: "Valve Status"                    },
    { key: "leakPpm",           label: "Leak Sensor",     unit: "ppm"   },
  ],
  communications: [
    { key: "signalDbm",         label: "Signal Strength",    unit: "dBm" },
    { key: "uptimePct",         label: "Uptime",             unit: "%"   },
    { key: "activeConnections", label: "Active Connections"              },
    { key: "backhaulStatus",    label: "Backhaul Status"                 },
  ],
  physical: [
    { key: "structuralHealthScore", label: "Structural Health Score", unit: "/100" },
    { key: "vibrationMms",          label: "Vibration",               unit: "mm/s" },
    { key: "tiltDegrees",           label: "Tilt Angle",              unit: "°"    },
    { key: "lastInspectionDate",    label: "Last Inspection"                       },
  ],
};

// ─── infraType → accent colour (matches INFRA_COLORS in smartCityData.js) ────
const INFRA_COLORS = {
  water:          "#00E5FF",
  gas:            "#f59e0b",
  communications: "#a855f7",
  physical:       "#39FF14",
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status || "online").toLowerCase();
  const cls =
    s === "critical" ? "badge badge-red" :
    s === "warning"  ? "badge badge-amber" :
                       "badge badge-green";
  return <span className={cls}>{status || "Online"}</span>;
}

// ─── infraType badge ──────────────────────────────────────────────────────────
function InfraBadge({ infraType }) {
  const cls =
    infraType === "water"          ? "badge badge-blue"   :
    infraType === "gas"            ? "badge badge-amber"  :
    infraType === "communications" ? "badge badge-purple" :
    infraType === "physical"       ? "badge badge-green"  :
                                     "badge badge-blue";
  return (
    <span className={cls} style={{ textTransform: "capitalize" }}>
      {infraType}
    </span>
  );
}

// ─── Format a single field value ──────────────────────────────────────────────
function FieldValue({ fieldCfg, value }) {
  if (value === undefined || value === null) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }

  if (fieldCfg.format === "boolean") {
    const isTrue = value === true || value === "true" || value === 1;
    return (
      <span style={{ color: isTrue ? "var(--red)" : "var(--green)", fontWeight: 600 }}>
        {isTrue ? "Yes" : "No"}
      </span>
    );
  }

  if (typeof value === "number") {
    const formatted = value.toFixed(1);
    return (
      <span style={{ color: "var(--text)", fontWeight: 500 }}>
        {formatted}
        {fieldCfg.unit && (
          <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 3 }}>
            {fieldCfg.unit}
          </span>
        )}
      </span>
    );
  }

  // string / date — display as-is
  return (
    <span style={{ color: "var(--text)", fontWeight: 500 }}>
      {String(value)}
      {fieldCfg.unit && (
        <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 3 }}>
          {fieldCfg.unit}
        </span>
      )}
    </span>
  );
}

// ─── Format the lastUpdated timestamp ────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return ts;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetDetailPanel({ asset, reading, infraType, onClose }) {
  if (!asset) return null;

  const fields   = FIELD_CONFIGS[infraType] || [];
  const src      = reading || asset;           // fall back to asset fields if no separate reading
  const accent   = INFRA_COLORS[infraType] || "var(--blue)";
  const lastUpd  = src.lastUpdated || asset.lastUpdated;

  return (
    <div
      className="card animate-slide-right"
      style={{
        position: "relative",
        padding: 0,
        overflow: "hidden",
        border: `1px solid ${accent}33`,
        boxShadow: `0 0 24px ${accent}22`,
        minWidth: 280,
      }}
    >
      {/* ── Accent top bar ── */}
      <div style={{ height: 3, background: accent }} />

      {/* ── Header: asset name + close ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.3,
            flex: 1,
            marginRight: 8,
          }}
        >
          {asset.name}
        </span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px 4px",
            borderRadius: 4,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ×
        </button>
      </div>

      {/* ── Sub-header: zone, infraType badge, status badge ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {asset.zone}
        </span>
        <span style={{ color: "var(--border2)" }}>·</span>
        <InfraBadge infraType={infraType} />
        <StatusBadge status={asset.status} />
      </div>

      {/* ── Sensor fields ── */}
      <div style={{ padding: "12px 16px" }}>
        {fields.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
            No field configuration for this infrastructure type.
          </p>
        )}
        {fields.map((fieldCfg) => (
          <div
            key={fieldCfg.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
              {fieldCfg.label}
            </span>
            <span style={{ fontSize: 13, textAlign: "right" }}>
              <FieldValue fieldCfg={fieldCfg} value={src[fieldCfg.key]} />
            </span>
          </div>
        ))}
      </div>

      {/* ── Footer: last updated timestamp ── */}
      <div
        style={{
          padding: "8px 16px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span className="live-dot" style={{ width: 6, height: 6 }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Last Updated: {formatTimestamp(lastUpd)}
        </span>
      </div>
    </div>
  );
}
