import {
  Zap, Activity, AlertTriangle, Brain, Clock, X,
  FileText, Droplets, Flame, ChevronRight, ChevronDown,
  Radio, Building2, Wifi,
} from "lucide-react";
import { useState } from "react";

/**
 * NAV_GROUPS — flat items use type:"item", grouped entries use type:"group".
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
const NAV_GROUPS = [
  { type: "item", id: "dashboard",  label: "Dashboard",           icon: Zap,           color: "var(--cyan)" },
  {
    type: "group",
    id: "infrastructure",
    label: "Infrastructure",
    defaultOpen: true,
    items: [
      { id: "monitoring", label: "Power",          icon: Zap,       color: "#3A86FF" },
      { id: "water",      label: "Water",          icon: Droplets,  color: "#00E5FF" },
      { id: "gas",        label: "Gas",            icon: Flame,     color: "#f59e0b" },
      { id: "comms",      label: "Communications", icon: Wifi,      color: "#a855f7" },
      { id: "physical",   label: "Physical",       icon: Building2, color: "#39FF14" },
    ],
  },
  { type: "item", id: "prediction", label: "Failure Prediction",   icon: AlertTriangle, color: "var(--amber)" },
  { type: "item", id: "decision",   label: "AI Decision Support",  icon: Brain,         color: "var(--green)" },
  { type: "item", id: "history",    label: "Historical Analytics", icon: Clock,         color: "var(--blue)" },
  { type: "item", id: "incidents",  label: "Incident Reports",     icon: FileText,      color: "var(--amber)" },
  { type: "item", id: "smartcity",  label: "Smart City",           icon: Radio,         color: "var(--cyan)" },
];

export default function Sidebar({ active, onChange, emergencyMode, alertCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);

  // Track open/closed state for each group; keyed by group id
  const [groupOpen, setGroupOpen] = useState(() => {
    const initial = {};
    NAV_GROUPS.forEach(entry => {
      if (entry.type === "group") initial[entry.id] = entry.defaultOpen ?? true;
    });
    return initial;
  });

  const toggleGroup = (id) => setGroupOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside style={{
      width: collapsed ? 60 : 224,
      minHeight: "100vh",
      background: "var(--panel)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      {/* logo */}
      <div style={{
        padding: collapsed ? "18px 14px" : "18px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
        minHeight: 64,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: emergencyMode
            ? "linear-gradient(135deg, var(--red), #c0392b)"
            : "linear-gradient(135deg, var(--blue), var(--cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: emergencyMode ? "var(--shadow-glow-red)" : "var(--shadow-glow-blue)",
          animation: emergencyMode ? "pulse-red 1.5s infinite" : "none",
          transition: "all 0.3s",
        }}>
          <Zap size={17} color="#fff" />
        </div>

        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontWeight: 800, fontSize: 14,
              color: emergencyMode ? "var(--red)" : "var(--cyan)",
              letterSpacing: 1.5, lineHeight: 1,
              animation: emergencyMode ? "glow-blue 2s infinite" : "none",
            }}>
              CRISIS GRID
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, letterSpacing: 0.5 }}>
              Bengaluru Smart City
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "var(--text-muted)", cursor: "pointer", padding: 4,
            borderRadius: 6, transition: "color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
        >
          {collapsed ? <ChevronRight size={15} /> : <X size={15} />}
        </button>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>
        {!collapsed && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "6px 8px 4px", letterSpacing: 1, fontWeight: 600 }}>
            NAVIGATION
          </div>
        )}

        {NAV_GROUPS.map(entry => {
          if (entry.type === "item") {
            const { id, label, icon: Icon, color } = entry;
            const isActive = active === id;
            return (
              <div key={id} className="tooltip-wrap" style={{ display: "block", marginBottom: 2 }}>
                <button
                  onClick={() => onChange(id)}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center",
                    gap: collapsed ? 0 : 10,
                    padding: collapsed ? "10px 0" : "9px 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 8, border: "none", cursor: "pointer",
                    background: isActive ? `${color}18` : "transparent",
                    color: isActive ? color : "var(--text-muted)",
                    borderLeft: isActive && !collapsed ? `2px solid ${color}` : "2px solid transparent",
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--panel2)"; e.currentTarget.style.color = "var(--text)"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                >
                  <Icon size={17} />
                  {!collapsed && (
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  )}
                  {/* alert badge on dashboard */}
                  {id === "dashboard" && alertCount > 0 && !collapsed && (
                    <span style={{
                      marginLeft: "auto", background: "var(--red)", color: "#fff",
                      borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700,
                    }}>
                      {alertCount}
                    </span>
                  )}
                </button>
                {collapsed && <span className="tooltip">{label}</span>}
              </div>
            );
          }

          if (entry.type === "group") {
            const { id, label, items } = entry;
            const isOpen = groupOpen[id] ?? true;
            // Is any sub-item active?
            const activeItem = items.find(it => it.id === active);
            const groupColor = activeItem ? activeItem.color : "var(--text-muted)";

            return (
              <div key={id} style={{ marginBottom: 2 }}>
                {/* Group header */}
                <div className="tooltip-wrap" style={{ display: "block" }}>
                  <button
                    onClick={() => toggleGroup(id)}
                    style={{
                      width: "100%",
                      display: "flex", alignItems: "center",
                      gap: collapsed ? 0 : 8,
                      padding: collapsed ? "10px 0" : "7px 10px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      borderRadius: 8, border: "none", cursor: "pointer",
                      background: activeItem && !collapsed ? `${activeItem.color}10` : "transparent",
                      color: groupColor,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--panel2)"; if (!activeItem) e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = activeItem && !collapsed ? `${activeItem.color}10` : "transparent"; if (!activeItem) e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    {/* When collapsed show a grid/layers icon; when expanded show chevron */}
                    {collapsed ? (
                      <Activity size={17} />
                    ) : (
                      <>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, flex: 1, textAlign: "left", color: "var(--text-dim)" }}>
                          {label.toUpperCase()}
                        </span>
                        {isOpen
                          ? <ChevronDown size={13} style={{ flexShrink: 0 }} />
                          : <ChevronRight size={13} style={{ flexShrink: 0 }} />
                        }
                      </>
                    )}
                  </button>
                  {collapsed && <span className="tooltip">{label}</span>}
                </div>

                {/* Sub-items */}
                {isOpen && !collapsed && (
                  <div style={{ paddingLeft: 8 }}>
                    {items.map(({ id: subId, label: subLabel, icon: SubIcon, color: subColor }) => {
                      const isActive = active === subId;
                      return (
                        <div key={subId} style={{ marginBottom: 1 }}>
                          <button
                            onClick={() => onChange(subId)}
                            style={{
                              width: "100%",
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "7px 10px",
                              borderRadius: 7, border: "none", cursor: "pointer",
                              background: isActive ? `${subColor}18` : "transparent",
                              color: isActive ? subColor : "var(--text-muted)",
                              borderLeft: isActive ? `2px solid ${subColor}` : "2px solid transparent",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--panel2)"; e.currentTarget.style.color = "var(--text)"; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                          >
                            <SubIcon size={15} />
                            <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>
                              {subLabel}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Collapsed: show sub-items as icon-only with tooltips */}
                {collapsed && (
                  <div>
                    {items.map(({ id: subId, label: subLabel, icon: SubIcon, color: subColor }) => {
                      const isActive = active === subId;
                      return (
                        <div key={subId} className="tooltip-wrap" style={{ display: "block", marginBottom: 1 }}>
                          <button
                            onClick={() => onChange(subId)}
                            style={{
                              width: "100%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              padding: "8px 0",
                              borderRadius: 7, border: "none", cursor: "pointer",
                              background: isActive ? `${subColor}18` : "transparent",
                              color: isActive ? subColor : "var(--text-muted)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--panel2)"; e.currentTarget.style.color = "var(--text)"; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                          >
                            <SubIcon size={15} />
                          </button>
                          <span className="tooltip">{subLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </nav>

      {/* emergency badge */}
      {emergencyMode && (
        <div style={{
          margin: 8, padding: collapsed ? "10px 0" : "10px 12px",
          borderRadius: 8, background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.4)",
          textAlign: "center", animation: "pulse-red 2s infinite",
        }}>
          {collapsed
            ? <span style={{ color: "var(--red)", fontSize: 16 }}>⚠</span>
            : <span style={{ color: "var(--red)", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>⚠ EMERGENCY MODE</span>
          }
        </div>
      )}

      {/* version */}
      {!collapsed && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)" }}>
          v2.0.0 · Bangalore Grid
        </div>
      )}
    </aside>
  );
}
