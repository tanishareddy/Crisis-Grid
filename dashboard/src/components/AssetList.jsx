/**
 * AssetList — scrollable table of infrastructure assets with status badges
 * and row highlighting based on per-infrastructure thresholds.
 *
 * Props:
 *   assets     — array of asset objects (from smartCityData.js)
 *   readings   — map of assetId → latest sensor reading object
 *   onSelect   — callback(asset) when a row is clicked
 *   selectedId — assetId of the currently selected asset
 *   infraType  — "water" | "gas" | "communications" | "physical"
 */

// ─── Key metric config per infraType ─────────────────────────────────────────
const KEY_METRIC = {
  water:          { field: "pressureBar",          label: "Pressure",    unit: "bar" },
  gas:            { field: "leakPpm",               label: "Leak (ppm)",  unit: "ppm" },
  communications: { field: "uptimePct",             label: "Uptime",      unit: "%"   },
  physical:       { field: "structuralHealthScore", label: "Health Score",unit: ""    },
};

// ─── Status derivation per infraType ─────────────────────────────────────────
function deriveStatus(infraType, reading) {
  if (!reading) return "ONLINE";

  switch (infraType) {
    case "water":
      if (reading.pressureBar < 1.5)      return "CRITICAL";
      if (reading.pumpHealthScore < 40)   return "WARNING";
      return "ONLINE";

    case "gas": {
      if (reading.leakPpm > 50) return "CRITICAL";
      const nominal = reading.nominalPressureBar;
      if (nominal && Math.abs(reading.outletPressureBar - nominal) / nominal > 0.20)
        return "WARNING";
      return "ONLINE";
    }

    case "communications":
      if (reading.backhaulStatus === "offline") return "CRITICAL";
      if (reading.uptimePct < 95)               return "WARNING";
      return "ONLINE";

    case "physical":
      if (reading.structuralHealthScore < 25) return "CRITICAL";
      if (reading.structuralHealthScore < 50) return "WARNING";
      return "ONLINE";

    default:
      return "ONLINE";
  }
}

// ─── Row condition → style ────────────────────────────────────────────────────
const ROW_STYLES = {
  CRITICAL: {
    borderLeft: "3px solid #FF3B3B",
    background: "rgba(255,59,59,0.07)",
  },
  WARNING: {
    borderLeft: "3px solid #FFB020",
    background: "rgba(255,176,32,0.07)",
  },
  ONLINE: {
    borderLeft: "3px solid transparent",
    background: "transparent",
  },
};

// ─── Badge component ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls =
    status === "CRITICAL" ? "badge badge-red" :
    status === "WARNING"  ? "badge badge-amber" :
                            "badge badge-green";
  return <span className={cls}>{status}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetList({ assets = [], readings = {}, onSelect, selectedId, infraType }) {
  const metric = KEY_METRIC[infraType] || KEY_METRIC.water;

  return (
    <div
      style={{
        overflowY: "auto",
        maxHeight: 400,
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--panel2)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            {["Name", "Zone", "Type", metric.label, "Status"].map((col) => (
              <th
                key={col}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const reading = readings[asset.assetId] || asset;
            const status  = deriveStatus(infraType, reading);
            const isSelected = asset.assetId === selectedId;
            const rowStyle = ROW_STYLES[status] || ROW_STYLES.ONLINE;
            const metricVal = reading[metric.field];
            const displayVal =
              metricVal !== undefined && metricVal !== null
                ? `${typeof metricVal === "number" ? metricVal.toFixed(metricVal % 1 === 0 ? 0 : 1) : metricVal}${metric.unit ? " " + metric.unit : ""}`
                : "—";

            return (
              <tr
                key={asset.assetId}
                onClick={() => onSelect && onSelect(asset)}
                style={{
                  ...rowStyle,
                  background: isSelected
                    ? "rgba(58,134,255,0.12)"
                    : rowStyle.background,
                  borderLeft: isSelected
                    ? "3px solid var(--blue)"
                    : rowStyle.borderLeft,
                  cursor: "pointer",
                  transition: "background 0.15s",
                  borderBottom: "1px solid var(--border)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--panel2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? "rgba(58,134,255,0.12)"
                    : rowStyle.background;
                }}
              >
                <td style={{ padding: "9px 12px", color: "var(--text)", fontWeight: 500 }}>
                  {asset.name}
                </td>
                <td style={{ padding: "9px 12px", color: "var(--text-muted)" }}>
                  {asset.zone}
                </td>
                <td style={{ padding: "9px 12px", color: "var(--text-dim)" }}>
                  {asset.assetId.split("_")[1] || "—"}
                </td>
                <td style={{ padding: "9px 12px", color: "var(--text)" }}>
                  {displayVal}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <StatusBadge status={status} />
                </td>
              </tr>
            );
          })}
          {assets.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: "24px 12px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                No assets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
