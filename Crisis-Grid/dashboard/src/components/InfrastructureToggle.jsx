/**
 * InfrastructureToggle — map overlay toggle bar
 * Floats inside the map, lets user switch between infrastructure layers
 */
const INFRA_LAYERS = [
  { id: "power",          label: "Power",   icon: "⚡", color: "#3A86FF" },
  { id: "water",          label: "Water",   icon: "💧", color: "#00E5FF" },
  { id: "gas",            label: "Gas",     icon: "🔥", color: "#f59e0b" },
  { id: "communications", label: "Comms",   icon: "📡", color: "#a855f7" },
  { id: "physical",       label: "Physical",icon: "🏗",  color: "#39FF14" },
];

export { INFRA_LAYERS };

export default function InfrastructureToggle({ active, onChange }) {
  return (
    <div style={{
      position: "absolute", top: 12, right: 12, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {INFRA_LAYERS.map(layer => {
        const isActive = active === layer.id;
        return (
          <button
            key={layer.id}
            onClick={() => onChange(layer.id)}
            title={layer.label}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 10px", borderRadius: 7, cursor: "pointer",
              background: isActive ? `${layer.color}22` : "rgba(8,12,20,0.88)",
              border: `1px solid ${isActive ? layer.color : "rgba(255,255,255,0.1)"}`,
              color: isActive ? layer.color : "var(--text-muted)",
              fontWeight: isActive ? 700 : 500,
              fontSize: 11,
              transition: "all 0.15s",
              backdropFilter: "blur(6px)",
              boxShadow: isActive ? `0 0 10px ${layer.color}44` : "none",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 13 }}>{layer.icon}</span>
            {layer.label}
            {isActive && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: layer.color, marginLeft: 2,
                animation: "pulse-green 1.5s infinite",
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
