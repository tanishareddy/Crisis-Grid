/**
 * DisasterModePanel — redesigned
 * Flow: 1) Select region on map  2) Pick disaster type  3) Full response dashboard
 * Features: animated evac routes, pulsing predicted zones, ETA countdown, simulation mode
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Polyline, CircleMarker, Tooltip, useMap, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { X, Play, Pause, SkipForward, ChevronLeft, Clock, Users, Package, MapPin, AlertTriangle, Activity } from "lucide-react";
import {
  BANGALORE_REGIONS, EMERGENCY_TYPES, SEVERITY_ZONE_COLORS,
  getScenario, buildSimulationSteps,
} from "../data/disasterData";
import { BANGALORE_CENTER, BANGALORE_BOUNDS } from "../data/bangaloreData";

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(bounds || BANGALORE_BOUNDS, { padding: [28, 28] }); }, [map, bounds]);
  return null;
}

// Animated dashed polyline — uses CSS animation via SVG path trick
function AnimatedRoute({ route, simActive }) {
  return (
    <Polyline
      positions={route.waypoints}
      pathOptions={{
        color: route.color,
        weight: simActive ? 5 : 4,
        opacity: 0.92,
        dashArray: "14 8",
        className: "evac-route-animated",
      }}
    >
      <Tooltip sticky>
        <div style={{ minWidth: 160 }}>
          <strong style={{ color: route.color }}>🚗 {route.name}</strong><br />
          <span style={{ color: route.status === "clear" ? "#39FF14" : "#FFB020" }}>
            {route.status === "clear" ? "✓ CLEAR" : "⚠ PARTIAL"}
          </span>
          &nbsp;· ETA <strong>{route.eta}</strong>
        </div>
      </Tooltip>
    </Polyline>
  );
}

// Pulsing predicted zone circle
function PulsingPredictedZone({ pred, tick }) {
  const pulse = tick % 2 === 0;
  const riskColor = pred.risk > 0.7 ? "#FF3B3B" : "#FF8C00";
  return (
    <Circle
      key={`${pred.id}-${pulse}`}
      center={[pred.lat, pred.lng]}
      radius={pulse ? 820 : 700}
      pathOptions={{
        color: riskColor,
        fillColor: riskColor,
        fillOpacity: pulse ? 0.18 : 0.08,
        weight: pulse ? 3 : 2,
        dashArray: "8 5",
      }}
    >
      <Tooltip sticky>
        <div style={{ minWidth: 180 }}>
          <strong style={{ color: riskColor }}>🟠 {pred.name}</strong><br />
          Risk: <strong>{Math.round(pred.risk * 100)}%</strong><br />
          {pred.reason}<br />
          ⏱ ETA: <strong>{pred.eta}</strong><br />
          👥 ~{(pred.population || 0).toLocaleString()} residents
        </div>
      </Tooltip>
    </Circle>
  );
}

// Region selector circles on the overview map
function RegionMarker({ region, selected, onClick }) {
  return (
    <CircleMarker
      center={[region.lat, region.lng]}
      radius={selected ? 22 : 16}
      pathOptions={{
        color: region.color,
        fillColor: region.color,
        fillOpacity: selected ? 0.45 : 0.2,
        weight: selected ? 3 : 2,
      }}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip permanent direction="top" offset={[0, -20]}>
        <span style={{ fontWeight: selected ? 800 : 600, color: region.color }}>{region.name}</span>
      </Tooltip>
    </CircleMarker>
  );
}

const STEP_LABELS = ["Select Region", "Choose Disaster", "Response Dashboard"];

export default function DisasterModePanel({ open, onClose, onScenarioChange }) {
  const [step, setStep] = useState(0);           // 0=region, 1=disaster type, 2=dashboard
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [simMode, setSimMode] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simPlaying, setSimPlaying] = useState(false);
  const [tick, setTick] = useState(0);           // drives pulsing animation
  const [etaCounters, setEtaCounters] = useState({});
  const [tab, setTab] = useState("overview");
  const simRef = useRef(null);
  const tickRef = useRef(null);

  // Pulse tick every 1.2s
  useEffect(() => {
    if (!open) return;
    tickRef.current = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(tickRef.current);
  }, [open]);

  // ETA countdown
  useEffect(() => {
    if (!scenario) return;
    const initial = {};
    scenario.predictedZones.forEach(p => {
      const match = p.eta.match(/(\d+(?:\.\d+)?)/);
      initial[p.id] = match ? Math.round(parseFloat(match[1]) * 60) : 120;
    });
    setEtaCounters(initial);
    const iv = setInterval(() => {
      setEtaCounters(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k] > 0) next[k] -= 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [scenario]);

  // Simulation auto-play
  useEffect(() => {
    if (simPlaying) {
      const steps = buildSimulationSteps(scenario);
      simRef.current = setInterval(() => {
        setSimStep(s => {
          if (s >= steps.length - 1) { setSimPlaying(false); return s; }
          return s + 1;
        });
      }, 2500);
    }
    return () => clearInterval(simRef.current);
  }, [simPlaying, scenario]);

  const handleRegionSelect = useCallback((region) => {
    setSelectedRegion(region);
    setStep(1);
  }, []);

  const handleDisasterSelect = useCallback((dtype) => {
    setSelectedDisaster(dtype);
    const sc = getScenario(selectedRegion.id, dtype.id);
    setScenario(sc);
    onScenarioChange?.(sc);
    setSimStep(0);
    setSimPlaying(false);
    setSimMode(false);
    setTab("overview");
    setStep(2);
  }, [selectedRegion]);

  const handleBack = () => {
    if (step === 2) { setStep(1); setScenario(null); }
    else if (step === 1) { setStep(0); setSelectedRegion(null); }
  };

  const handleClose = () => {
    setStep(0); setSelectedRegion(null); setSelectedDisaster(null);
    setScenario(null); setSimMode(false); setSimPlaying(false); setSimStep(0);
    onScenarioChange?.(null);
    onClose();
  };

  const simSteps = scenario ? buildSimulationSteps(scenario) : [];
  const activeZones = simMode ? (simSteps[simStep]?.zones || []) : (scenario?.affectedZones || []);
  const activePredicted = simMode ? (simSteps[simStep]?.predicted || []) : (scenario?.predictedZones || []);

  if (!open) return null;

  const fmtEta = (secs) => {
    if (secs <= 0) return "IMMINENT";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      background: "#080C14",
      display: "flex", flexDirection: "column",
      animation: "fadeIn 0.2s ease",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
        background: "rgba(255,30,30,0.10)",
        borderBottom: "1px solid rgba(255,59,59,0.35)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {step > 0 && (
            <button onClick={handleBack} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 5, fontSize: 12,
            }}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(255,59,59,0.2)", border: "1px solid #FF3B3B",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, animation: "pulse-red 1.5s infinite",
          }}>
            {step === 2 && selectedDisaster ? selectedDisaster.icon : "⚠"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#FF3B3B", letterSpacing: 0.5 }}>
              ⚠ DISASTER MODE
              {step === 2 && selectedRegion && selectedDisaster && (
                <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
                  {selectedRegion.name} · {selectedDisaster.label}
                </span>
              )}
            </div>
            {/* Step breadcrumb */}
            <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
              {STEP_LABELS.map((l, i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  color: i === step ? "#FF3B3B" : i < step ? "#39FF14" : "var(--text-muted)",
                  textTransform: "uppercase",
                }}>
                  {i < step ? "✓" : `${i + 1}.`} {l}{i < 2 ? " ›" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleClose} style={{
          background: "rgba(255,59,59,0.15)", border: "1px solid rgba(255,59,59,0.4)",
          borderRadius: 6, padding: "7px 10px", cursor: "pointer", color: "#FF3B3B",
          display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
        }}>
          <X size={15} /> Close
        </button>
      </div>

      {/* ── STEP 0: Region Selection ── */}
      {step === 0 && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <MapContainer
              center={[BANGALORE_CENTER.lat, BANGALORE_CENTER.lng]}
              zoom={12}
              style={{ height: "100%", width: "100%", background: "#0B0F1A" }}
              scrollWheelZoom={true}
            >
              <FitBounds />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" maxZoom={19} />
              {BANGALORE_REGIONS.map(r => (
                <RegionMarker key={r.id} region={r} selected={false} onClick={() => handleRegionSelect(r)} />
              ))}
            </MapContainer>
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              zIndex: 1000, pointerEvents: "none",
              background: "rgba(8,12,20,0.85)", border: "1px solid rgba(255,59,59,0.4)",
              borderRadius: 10, padding: "14px 22px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>📍</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Select an Affected Region</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Click a zone on the map to begin</div>
            </div>
          </div>
          {/* Region list sidebar */}
          <div style={{ width: 260, background: "#0B0F1A", borderLeft: "1px solid rgba(255,59,59,0.2)", overflowY: "auto", padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#FF3B3B", letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>
              Bangalore Regions
            </div>
            {BANGALORE_REGIONS.map(r => (
              <button key={r.id} onClick={() => handleRegionSelect(r)} style={{
                width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                background: "var(--panel)", border: `1px solid ${r.color}44`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = r.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${r.color}44`}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 1: Disaster Type Selection ── */}
      {step === 1 && selectedRegion && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <MapContainer
              center={[selectedRegion.lat, selectedRegion.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%", background: "#0B0F1A" }}
              scrollWheelZoom={true}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <CircleMarker center={[selectedRegion.lat, selectedRegion.lng]} radius={28}
                pathOptions={{ color: selectedRegion.color, fillColor: selectedRegion.color, fillOpacity: 0.25, weight: 3 }}>
                <Tooltip permanent><strong style={{ color: selectedRegion.color }}>{selectedRegion.name}</strong></Tooltip>
              </CircleMarker>
            </MapContainer>
          </div>
          <div style={{ width: 320, background: "#0B0F1A", borderLeft: "1px solid rgba(255,59,59,0.2)", padding: 20, overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#FF3B3B", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
              Region Selected
            </div>
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 18,
              background: `${selectedRegion.color}18`, border: `1px solid ${selectedRegion.color}55`,
              fontSize: 13, fontWeight: 700, color: selectedRegion.color,
            }}>
              📍 {selectedRegion.name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#FF3B3B", letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>
              Select Disaster Type
            </div>
            {EMERGENCY_TYPES.map(dtype => (
              <button key={dtype.id} onClick={() => handleDisasterSelect(dtype)} style={{
                width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 10, marginBottom: 8,
                background: "var(--panel)", border: `1px solid ${dtype.color}44`,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = dtype.color; e.currentTarget.style.background = `${dtype.color}12`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${dtype.color}44`; e.currentTarget.style.background = "var(--panel)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{dtype.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: dtype.color }}>{dtype.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{dtype.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: Full Response Dashboard ── */}
      {step === 2 && scenario && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── MAP ── */}
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            <MapContainer
              center={[selectedRegion.lat, selectedRegion.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%", background: "#0B0F1A" }}
              scrollWheelZoom={true}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" maxZoom={19} />

              {/* Affected zones */}
              {activeZones.map(zone => {
                const c = SEVERITY_ZONE_COLORS[zone.severity] || SEVERITY_ZONE_COLORS.medium;
                return (
                  <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={zone.radius}
                    pathOptions={{ color: c.stroke, fillColor: c.stroke, fillOpacity: 0.22, weight: 2.5 }}
                  >
                    <Tooltip sticky>
                      <div style={{ minWidth: 170 }}>
                        <strong style={{ color: c.stroke }}>🔴 {zone.name}</strong><br />
                        Severity: <strong>{zone.severity.toUpperCase()}</strong><br />
                        👥 ~{(zone.population || 0).toLocaleString()} affected<br />
                        Density: {zone.density || "—"}
                      </div>
                    </Tooltip>
                  </Circle>
                );
              })}

              {/* Pulsing predicted zones */}
              {activePredicted.map(pred => (
                <PulsingPredictedZone key={pred.id} pred={pred} tick={tick} />
              ))}

              {/* Animated evacuation routes */}
              {scenario.routes.map(route => (
                <AnimatedRoute key={route.id} route={route} simActive={simMode} />
              ))}

              {/* Route direction arrows (waypoint markers) */}
              {scenario.routes.map(route =>
                route.waypoints.slice(1).map((wp, i) => (
                  <CircleMarker key={`${route.id}-wp-${i}`} center={wp} radius={4}
                    pathOptions={{ color: route.color, fillColor: route.color, fillOpacity: 0.9, weight: 1 }}
                  >
                    <Tooltip>→ {route.name}</Tooltip>
                  </CircleMarker>
                ))
              )}

              {/* Hospitals */}
              {scenario.hospitals.map(h => (
                <CircleMarker key={h.id} center={[h.lat, h.lng]} radius={9}
                  pathOptions={{ color: "#00E5FF", fillColor: "#00E5FF", fillOpacity: 0.9, weight: 2 }}
                >
                  <Tooltip>
                    <div>
                      <strong style={{ color: "#00E5FF" }}>🏥 {h.name}</strong><br />
                      Beds available: <strong>{h.beds}</strong><br />
                      Distance: {h.distance}
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Simulation controls overlay */}
            <div style={{
              position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
              zIndex: 1000, display: "flex", alignItems: "center", gap: 8,
              background: "rgba(8,12,20,0.92)", border: "1px solid rgba(255,140,0,0.4)",
              borderRadius: 10, padding: "8px 14px",
            }}>
              <button onClick={() => setSimMode(s => !s)} style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: simMode ? "rgba(255,140,0,0.2)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${simMode ? "#FF8C00" : "var(--border)"}`,
                color: simMode ? "#FF8C00" : "var(--text-muted)",
                animation: simMode ? "sim-pulse 1.5s infinite" : "none",
              }}>
                <Activity size={12} style={{ display: "inline", marginRight: 4 }} />
                {simMode ? "SIM ON" : "Simulation"}
              </button>
              {simMode && (
                <>
                  <button onClick={() => { setSimStep(0); setSimPlaying(false); }} style={simBtnStyle}>⏮</button>
                  <button onClick={() => setSimPlaying(p => !p)} style={{ ...simBtnStyle, color: simPlaying ? "#FF3B3B" : "#39FF14" }}>
                    {simPlaying ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button onClick={() => setSimStep(s => Math.min(s + 1, simSteps.length - 1))} style={simBtnStyle}>
                    <SkipForward size={13} />
                  </button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {simSteps.map((st, i) => (
                      <button key={i} onClick={() => setSimStep(i)} style={{
                        width: 28, height: 22, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
                        background: i === simStep ? "rgba(255,140,0,0.3)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${i === simStep ? "#FF8C00" : "var(--border)"}`,
                        color: i === simStep ? "#FF8C00" : "var(--text-muted)",
                      }}>{st.label.split(" ")[0]}</button>
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "#FF8C00", fontWeight: 700 }}>
                    {simSteps[simStep]?.label}
                  </span>
                </>
              )}
            </div>

            {/* Map legend */}
            <div style={{
              position: "absolute", bottom: 16, left: 16, zIndex: 1000,
              background: "rgba(8,12,20,0.92)", border: "1px solid rgba(255,59,59,0.3)",
              borderRadius: 8, padding: "10px 14px", fontSize: 11,
            }}>
              <div style={{ color: "#FF3B3B", fontWeight: 700, marginBottom: 8, fontSize: 10, letterSpacing: 1 }}>MAP LEGEND</div>
              {[
                { color: "#FF3B3B", label: "Critical Zone",    dash: false },
                { color: "#FF6B35", label: "High Zone",        dash: false },
                { color: "#FFB020", label: "Medium Zone",      dash: false },
                { color: "#FF8C00", label: "Predicted (next)", dash: true  },
                { color: "#00E5FF", label: "Hospital",         dash: false },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <div style={{
                    width: item.dash ? 14 : 10, height: item.dash ? 3 : 10,
                    borderRadius: item.dash ? 1 : "50%", background: item.color, flexShrink: 0,
                  }} />
                  <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                </div>
              ))}
              {scenario.routes.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 14, height: 3, background: r.color, borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{r.name.split("—")[0].trim()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{
            width: 390, flexShrink: 0, display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(255,59,59,0.25)", background: "#0B0F1A", overflow: "hidden",
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,59,59,0.2)", flexShrink: 0 }}>
              {[
                { id: "overview",  label: "Overview" },
                { id: "routes",    label: "Routes" },
                { id: "resources", label: "Resources" },
                { id: "predicted", label: "Predicted" },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: "10px 4px", fontSize: 10, fontWeight: 700,
                  cursor: "pointer", border: "none",
                  background: tab === t.id ? "rgba(255,59,59,0.12)" : "transparent",
                  color: tab === t.id ? "#FF3B3B" : "var(--text-muted)",
                  borderBottom: tab === t.id ? "2px solid #FF3B3B" : "2px solid transparent",
                  transition: "all 0.15s", textTransform: "uppercase", letterSpacing: 0.5,
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

              {/* OVERVIEW */}
              {tab === "overview" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Affected Zones",   value: activeZones.length,                                                icon: "🔴", color: "#FF3B3B" },
                      { label: "Predicted Next",   value: activePredicted.length,                                           icon: "🟠", color: "#FF8C00" },
                      { label: "Evac Routes",      value: scenario.routes.length,                                           icon: "🚗", color: "#00E5FF" },
                      { label: "Response Teams",   value: scenario.resources.teams,                                         icon: "👥", color: "#39FF14" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 16 }}>{s.icon}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <PanelSection icon={AlertTriangle} label="Affected Areas">
                    {activeZones.map(zone => {
                      const c = SEVERITY_ZONE_COLORS[zone.severity] || SEVERITY_ZONE_COLORS.medium;
                      return (
                        <div key={zone.id} style={{
                          padding: "9px 12px", borderRadius: 7, marginBottom: 6,
                          background: "var(--panel)", borderLeft: `3px solid ${c.stroke}`,
                          border: `1px solid ${c.stroke}33`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{zone.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${c.stroke}22`, color: c.stroke }}>
                              {zone.severity.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                            👥 ~{(zone.population || 0).toLocaleString()} · Density: {zone.density || "—"}
                          </div>
                        </div>
                      );
                    })}
                  </PanelSection>

                  <PanelSection icon={MapPin} label="Nearby Hospitals">
                    {scenario.hospitals.map(h => (
                      <div key={h.id} style={{
                        padding: "9px 12px", borderRadius: 7, marginBottom: 6,
                        background: "var(--panel)", border: "1px solid rgba(0,229,255,0.2)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#00E5FF" }}>🏥 {h.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{h.distance} away</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#39FF14" }}>{h.beds} beds</span>
                      </div>
                    ))}
                  </PanelSection>
                </div>
              )}

              {/* ROUTES */}
              {tab === "routes" && (
                <div>
                  <div style={{
                    padding: "9px 11px", borderRadius: 6, marginBottom: 12,
                    background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)",
                    fontSize: 10, color: "var(--text-muted)",
                  }}>
                    🚗 Animated arrows on map show evacuation direction. Routes update dynamically in simulation mode.
                  </div>
                  {scenario.routes.map(route => (
                    <div key={route.id} style={{
                      padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                      background: "var(--panel)", borderLeft: `3px solid ${route.color}`,
                      border: `1px solid ${route.color}33`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: route.color }}>{route.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                          background: route.status === "clear" ? "rgba(57,255,20,0.15)" : "rgba(255,176,32,0.15)",
                          color: route.status === "clear" ? "#39FF14" : "#FFB020",
                        }}>
                          {route.status === "clear" ? "✓ CLEAR" : "⚠ PARTIAL"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <Clock size={11} color="#FF8C00" />
                        <span style={{ fontSize: 11, color: "#FF8C00", fontWeight: 700, animation: "eta-tick 2s infinite" }}>
                          ETA: {route.eta}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>
                          {route.waypoints.length} waypoints
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RESOURCES */}
              {tab === "resources" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Response Teams",    value: scenario.resources.teams,                          icon: "👥", color: "#39FF14" },
                      { label: "Ambulances",         value: scenario.resources.ambulances,                    icon: "🚑", color: "#00E5FF" },
                      { label: "Rescue Boats",       value: scenario.resources.boats,                         icon: "🚤", color: "#3A86FF" },
                      { label: "Shelter Capacity",   value: scenario.resources.shelterCapacity.toLocaleString(), icon: "⛺", color: "#FFB020" },
                      { label: "Relief Kits",        value: scenario.resources.reliefKits.toLocaleString(),   icon: "📦", color: "#8B5CF6" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 18 }}>{s.icon}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <PanelSection icon={MapPin} label="Hospitals & Emergency Facilities">
                    {scenario.hospitals.map(h => (
                      <div key={h.id} style={{
                        padding: "10px 12px", borderRadius: 7, marginBottom: 6,
                        background: "var(--panel)", border: "1px solid rgba(0,229,255,0.25)",
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#00E5FF" }}>🏥 {h.name}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>📍 {h.distance}</span>
                          <span style={{ fontSize: 10, color: "#39FF14" }}>🛏 {h.beds} beds</span>
                        </div>
                      </div>
                    ))}
                  </PanelSection>
                </div>
              )}

              {/* PREDICTED */}
              {tab === "predicted" && (
                <div>
                  <div style={{
                    padding: "9px 11px", borderRadius: 6, marginBottom: 12,
                    background: "rgba(255,140,0,0.06)", border: "1px solid rgba(255,140,0,0.25)",
                    fontSize: 10, color: "var(--text-muted)",
                  }}>
                    🟠 Pulsing orange circles on the map show areas predicted to be affected next. ETA counts down in real time.
                  </div>
                  {activePredicted.map(pred => {
                    const riskPct = Math.round(pred.risk * 100);
                    const riskColor = riskPct > 70 ? "#FF3B3B" : "#FF8C00";
                    const remaining = etaCounters[pred.id] ?? 0;
                    return (
                      <div key={pred.id} style={{
                        padding: "12px 14px", borderRadius: 8, marginBottom: 9,
                        background: "var(--panel)", border: "1px solid rgba(255,140,0,0.3)",
                        borderLeft: "3px solid #FF8C00",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>🟠 {pred.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: riskColor, background: `${riskColor}22`, padding: "2px 8px", borderRadius: 4 }}>
                            {riskPct}%
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5 }}>{pred.reason}</div>
                        <div style={{ background: "var(--bg)", borderRadius: 3, height: 4, overflow: "hidden", marginTop: 8 }}>
                          <div style={{ width: `${riskPct}%`, height: "100%", background: riskColor, borderRadius: 3 }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                            👥 ~{(pred.population || 0).toLocaleString()} residents
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: remaining < 300 ? "#FF3B3B" : "#FF8C00",
                            animation: "eta-tick 1.5s infinite",
                          }}>
                            ⏱ {fmtEta(remaining)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {activePredicted.length === 0 && (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 30 }}>
                      No predicted zones at this simulation step.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared section header
function PanelSection({ icon: Icon, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Icon size={12} color="#FF3B3B" />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#FF3B3B", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

const simBtnStyle = {
  padding: "4px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer",
  background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
  color: "var(--text-muted)", display: "flex", alignItems: "center",
};
