/**
 * LayerToggle — overlaid map control for toggling infrastructure layers.
 * Requirements: 1.1, 1.4, 1.8
 */

const INFRA_TYPES = [
  { key: "power",          icon: "⚡", label: "Power",    color: "#3A86FF" },
  { key: "water",          icon: "💧", label: "Water",    color: "#00E5FF" },
  { key: "gas",            icon: "🔥", label: "Gas",      color: "#f59e0b" },
  { key: "communications", icon: "📡", label: "Comms",    color: "#a855f7" },
  { key: "physical",       icon: "🏗",  label: "Physical", color: "#39FF14" },
];

/**
 * @param {{ activeLayers: Set<string>, onToggle: (infraType: string) => void, compact?: boolean }} props
 */
export default function LayerToggle({ activeLayers, onToggle, compact = false }) {
  return (
    <div style={styles.container}>
      {INFRA_TYPES.map(({ key, icon, label, color }) => {
        const isActive = activeLayers.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            title={label}
            aria-pressed={isActive}
            style={{
              ...styles.button,
              ...(isActive ? activeStyle(color) : styles.inactive),
              ...(compact ? styles.compactButton : {}),
            }}
          >
            <span style={styles.icon}>{icon}</span>
            {!compact && <span style={styles.label}>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function activeStyle(color) {
  return {
    backgroundColor: `${color}33`, // ~20% opacity tint
    border: `1px solid ${color}`,
    color: "#e2e8f0",
  };
}

const styles = {
  container: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: "rgba(11,15,26,0.92)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: 8,
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.18s",
    whiteSpace: "nowrap",
    outline: "none",
  },
  inactive: {
    backgroundColor: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
  },
  compactButton: {
    padding: "6px 8px",
    justifyContent: "center",
  },
  icon: {
    fontSize: 15,
    lineHeight: 1,
  },
  label: {
    fontSize: 12,
  },
};
