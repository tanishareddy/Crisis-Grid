import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { SUBSTATIONS, TRANSMISSION_LINES, CRITICAL_FACILITIES, BANGALORE_CENTER, BANGALORE_BOUNDS } from "../data/bangaloreData";
import { INFRA_COLORS, WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS } from "../data/smartCityData";
import DisasterModeOverlay from "./DisasterModeOverlay";
import InfrastructureToggle from "./InfrastructureToggle";

// Fix Leaflet default icon broken paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SEVERITY_COLOR = {
  low:      "#39FF14",
  medium:   "#FFB020",
  high:     "#FF3B3B",
  critical: "#FF3B3B",
};

const FACILITY_COLORS = {
  hospital:        "#00E5FF",
  military:        "#FFB020",
  water_treatment: "#3A86FF",
  residential:     "#39FF14",
};

const FACILITY_EMOJI = {
  hospital:        "🏥",
  military:        "🛡",
  water_treatment: "💧",
  residential:     "🏘",
};

// Animates map to fit bounds on load
function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(BANGALORE_BOUNDS, { padding: [20, 20] });
  }, [map]);
  return null;
}

// Derive a simple Risk_Level string from a SensorReading's status field
function getRiskLevelFromReading(reading) {
  if (!reading) return "Unknown";
  switch (reading.status) {
    case "online":   return "Low";
    case "warning":  return "Medium";
    case "critical": return "High";
    default:         return "Unknown";
  }
}

// Map status → dot color
function statusColor(status) {
  if (status === "critical") return "#FF3B3B";
  if (status === "warning")  return "#FFB020";
  return "#39FF14";
}

// Build tooltip content per infra type from a reading
function infraTooltip(asset, reading) {
  if (!reading) return asset.name;
  const type = asset.infraType;
  if (type === "water") {
    return `💧 ${asset.name}\nZone: ${asset.zone}\nPressure: ${reading.pressureBar} bar\nFlow: ${reading.flowLps} L/s\nPump Health: ${reading.pumpHealthScore}/100\n${reading.leakDetected ? "⚠ LEAK DETECTED" : ""}`;
  }
  if (type === "gas") {
    return `🔥 ${asset.name}\nZone: ${asset.zone}\nLeak: ${reading.leakPpm} ppm\nOutlet: ${reading.outletPressureBar} bar\nFlow: ${reading.flowM3h} m³/h\nValve: ${reading.valveStatus}`;
  }
  if (type === "communications") {
    return `📡 ${asset.name}\nZone: ${asset.zone}\nUptime: ${reading.uptimePct}%\nSignal: ${reading.signalDbm} dBm\nBackhaul: ${reading.backhaulStatus}\nConns: ${reading.activeConnections}`;
  }
  if (type === "physical") {
    return `🏗 ${asset.name}\nZone: ${asset.zone}\nHealth: ${reading.structuralHealthScore}/100\nVibration: ${reading.vibrationMms} mm/s\nTilt: ${reading.tiltDegrees}°`;
  }
  return asset.name;
}

// Assets per infra type
const INFRA_ASSETS = {
  water:          WATER_ASSETS,
  gas:            GAS_ASSETS,
  communications: COMMS_ASSETS,
  physical:       PHYSICAL_ASSETS,
};

// Legend config per infra type
const INFRA_LEGENDS = {
  power: {
    title: "⚡ POWER — BESCOM Grid",
    items: [["#39FF14","Normal"],["#FFB020","Warning"],["#FF3B3B","Critical"],["#00E5FF","Rerouting"]],
    footer: "● 220kV   ● 110kV   · 66kV",
  },
  water: {
    title: "💧 WATER — Distribution",
    items: [["#39FF14","Normal"],["#FFB020","Low Pressure"],["#FF3B3B","Leak Detected"]],
    footer: "● Pump  ● Reservoir  ● Pipeline",
  },
  gas: {
    title: "🔥 GAS — Pipeline Network",
    items: [["#39FF14","Normal"],["#FFB020","Pressure Anomaly"],["#FF3B3B","Leak >50 ppm"]],
    footer: "● Pipeline  ● Station  ● Valve",
  },
  communications: {
    title: "📡 COMMS — Network Nodes",
    items: [["#39FF14","Online"],["#FFB020","Degraded"],["#FF3B3B","Offline"]],
    footer: "● Tower  ● Fibre  ● Exchange",
  },
  physical: {
    title: "🏗 PHYSICAL — Structures",
    items: [["#39FF14","Healthy (≥50)"],["#FFB020","Warning (25–50)"],["#FF3B3B","Critical (<25)"]],
    footer: "● Bridge  ● Building  ● Road",
  },
};

export default function BangaloreMap({ substationData, emergencyMode, rerouteAnimation, layers, activeLayers, layerReadings, disasterMode, disasterEmergencyType, disasterScenario, activeInfra, infraData, onInfraChange }) {
  // Power layer is active when activeInfra is "power" or not set
  const powerActive = !activeInfra || activeInfra === "power";
  const getStatus = (id) => substationData?.[id] || null;

  const getLineColor = (line) => {
    const fromStatus = getStatus(line.from);
    const toStatus   = getStatus(line.to);
    if (!fromStatus || !toStatus) return "#1E2A3A";

    // active reroute — highlight the reroute path in cyan
    if (rerouteAnimation?.active) {
      const { faultedId, rerouteTo } = rerouteAnimation;
      if ((line.from === faultedId || line.to === faultedId) && rerouteTo?.includes(line.from === faultedId ? line.to : line.from)) {
        return "#00E5FF";
      }
      if (line.from === faultedId || line.to === faultedId) return "#FF3B3B";
    }

    const worstSeverity = [fromStatus.severity, toStatus.severity].includes("critical") ? "critical"
      : [fromStatus.severity, toStatus.severity].includes("high") ? "high"
      : [fromStatus.severity, toStatus.severity].includes("medium") ? "medium"
      : "low";

    return SEVERITY_COLOR[worstSeverity] || "#3A86FF";
  };

  const getLineWeight = (line) => {
    if (line.kv >= 220) return 3;
    if (line.kv >= 110) return 2;
    return 1.5;
  };

  const getLineDash = (line) => {
    if (rerouteAnimation?.active) {
      const { faultedId, rerouteTo } = rerouteAnimation;
      if (rerouteTo?.includes(line.from === faultedId ? line.to : line.from) &&
          (line.from === faultedId || line.to === faultedId)) {
        return "8 4";
      }
    }
    return null;
  };

  return (
    <div style={{
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${(emergencyMode || disasterMode) ? "var(--red)" : "var(--border)"}`,
      height: 520,
      position: "relative",
    }}>
      {emergencyMode && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: "rgba(255,59,59,0.9)", color: "#fff",
          borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700,
          animation: "pulse-red 1.5s infinite",
        }}>
          ⚠ EMERGENCY MODE — CRITICAL INFRASTRUCTURE PRIORITY
        </div>
      )}

      <MapContainer
        center={[BANGALORE_CENTER.lat, BANGALORE_CENTER.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%", background: "#0B0F1A" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <FitBounds />

        {/* Dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {/* Transmission lines — power layer only */}
        {powerActive && TRANSMISSION_LINES.map((line, i) => {
          const fromSub = SUBSTATIONS.find(s => s.id === line.from);
          const toSub   = SUBSTATIONS.find(s => s.id === line.to);
          if (!fromSub || !toSub) return null;
          const color = getLineColor(line);
          const dash  = getLineDash(line);
          return (
            <Polyline
              key={i}
              positions={[[fromSub.lat, fromSub.lng], [toSub.lat, toSub.lng]]}
              pathOptions={{
                color,
                weight: getLineWeight(line),
                opacity: 0.8,
                dashArray: dash,
              }}
            >
              <Tooltip sticky>
                {line.kv}kV line · {line.length_km}km<br />
                {fromSub.shortName} ↔ {toSub.shortName}
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Critical facilities — power layer only */}
        {powerActive && CRITICAL_FACILITIES.map(f => {
          const dimmed = emergencyMode && !["hospital","military","water_treatment","residential"].includes(f.type);
          return (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng]}
              radius={5}
              pathOptions={{
                color: FACILITY_COLORS[f.type],
                fillColor: FACILITY_COLORS[f.type],
                fillOpacity: dimmed ? 0.15 : 0.9,
                weight: 1,
              }}
            >
              <Tooltip permanent={false}>
                {FACILITY_EMOJI[f.type]} {f.name}<br />
                <span style={{ fontSize: 10 }}>Powered by: {SUBSTATIONS.find(s => s.id === f.poweredBy)?.shortName}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Substation nodes — power layer only */}
        {powerActive && SUBSTATIONS.map(sub => {
          const data   = getStatus(sub.id);
          const color  = data ? SEVERITY_COLOR[data.severity] : "#3A86FF";
          const radius = sub.voltage_kv >= 220 ? 14 : sub.voltage_kv >= 110 ? 11 : 8;
          const isFaulted = rerouteAnimation?.active && rerouteAnimation.faultedId === sub.id;
          const isRerouting = rerouteAnimation?.active && rerouteAnimation.rerouteTo?.includes(sub.id);

          return (
            <CircleMarker
              key={sub.id}
              center={[sub.lat, sub.lng]}
              radius={radius}
              pathOptions={{
                color: isFaulted ? "#FF3B3B" : isRerouting ? "#00E5FF" : color,
                fillColor: isFaulted ? "#FF3B3B" : isRerouting ? "#00E5FF" : color,
                fillOpacity: 0.85,
                weight: isFaulted ? 3 : isRerouting ? 3 : 2,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -radius - 2]}>
                <span style={{ fontWeight: 700 }}>{sub.shortName}</span>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 200, fontFamily: "monospace", fontSize: 12 }}>
                  <strong>⚡ {sub.name}</strong><br />
                  <span style={{ color: "#888" }}>{sub.area} · {sub.voltage_kv}kV · {sub.capacity_mva} MVA</span><br /><br />
                  {data ? (
                    <>
                      <b>Status:</b> {data.severity?.toUpperCase()}<br />
                      <b>Fault:</b> {data.fault_type?.replace(/_/g, " ")}<br />
                      <b>Risk:</b> {(data.failure_probability * 100).toFixed(1)}%<br />
                      <b>Load:</b> {data.sensor_readings?.load_percent?.toFixed(1)}%<br />
                      <b>Temp:</b> {data.sensor_readings?.transformer_temp_c?.toFixed(1)}°C<br />
                      <b>Voltage:</b> {data.sensor_readings?.voltage_v?.toFixed(1)}V<br />
                      <b>Health:</b> {data.sensor_readings?.health_score?.toFixed(0)}/100
                    </>
                  ) : <span>Loading...</span>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Disaster mode overlay */}
        <DisasterModeOverlay active={disasterMode} scenario={disasterScenario} />

        {/* Non-power infrastructure layers */}
        {activeInfra && activeInfra !== "power" && (() => {
          const assets = INFRA_ASSETS[activeInfra] || [];
          const color  = INFRA_COLORS[activeInfra] || "#ffffff";
          return assets.map(asset => {
            const reading = infraData?.get(asset.assetId);
            const dotColor = reading ? statusColor(reading.status) : color;
            const tip = infraTooltip(asset, reading);
            const isCritical = reading?.status === "critical";
            return (
              <CircleMarker
                key={asset.assetId}
                center={[asset.lat, asset.lng]}
                radius={isCritical ? 9 : 7}
                pathOptions={{
                  color: dotColor,
                  fillColor: dotColor,
                  fillOpacity: 0.85,
                  weight: isCritical ? 2.5 : 1.5,
                }}
              >
                <Tooltip sticky>
                  <div style={{ whiteSpace: "pre-line", fontSize: 11 }}>{tip}</div>
                </Tooltip>
              </CircleMarker>
            );
          });
        })()}

        {/* Gas pipeline lines between adjacent assets */}
        {activeInfra === "gas" && (() => {
          const assets = GAS_ASSETS;
          const lines = [];
          // Connect assets within same zone
          const byZone = {};
          assets.forEach(a => { (byZone[a.zone] = byZone[a.zone] || []).push(a); });
          Object.values(byZone).forEach(zoneAssets => {
            for (let i = 0; i < zoneAssets.length - 1; i++) {
              const a = zoneAssets[i], b = zoneAssets[i + 1];
              const rA = infraData?.get(a.assetId);
              const rB = infraData?.get(b.assetId);
              const worst = (rA?.status === "critical" || rB?.status === "critical") ? "critical"
                          : (rA?.status === "warning"  || rB?.status === "warning")  ? "warning" : "online";
              lines.push(
                <Polyline key={`${a.assetId}-${b.assetId}`}
                  positions={[[a.lat, a.lng], [b.lat, b.lng]]}
                  pathOptions={{
                    color: statusColor(worst),
                    weight: 2,
                    opacity: 0.65,
                    dashArray: worst !== "online" ? "6 4" : null,
                  }}
                >
                  <Tooltip sticky>{a.zone} gas pipeline segment</Tooltip>
                </Polyline>
              );
            }
          });
          return lines;
        })()}

        {/* Water pipeline lines between adjacent assets */}
        {activeInfra === "water" && (() => {
          const assets = WATER_ASSETS;
          const lines = [];
          const byZone = {};
          assets.forEach(a => { (byZone[a.zone] = byZone[a.zone] || []).push(a); });
          Object.values(byZone).forEach(zoneAssets => {
            for (let i = 0; i < zoneAssets.length - 1; i++) {
              const a = zoneAssets[i], b = zoneAssets[i + 1];
              const rA = infraData?.get(a.assetId);
              const rB = infraData?.get(b.assetId);
              const worst = (rA?.status === "critical" || rB?.status === "critical") ? "critical"
                          : (rA?.status === "warning"  || rB?.status === "warning")  ? "warning" : "online";
              lines.push(
                <Polyline key={`${a.assetId}-${b.assetId}`}
                  positions={[[a.lat, a.lng], [b.lat, b.lng]]}
                  pathOptions={{
                    color: statusColor(worst),
                    weight: 2,
                    opacity: 0.6,
                    dashArray: worst !== "online" ? "5 4" : null,
                  }}
                >
                  <Tooltip sticky>{a.zone} water main</Tooltip>
                </Polyline>
              );
            }
          });
          return lines;
        })()}

        {/* Additional infrastructure layers (legacy prop support) */}
        {layers && Array.from(layers.entries()).map(([infraType, assets]) => {
          if (!activeLayers || !activeLayers.has(infraType)) return null;
          const color = INFRA_COLORS[infraType] || "#ffffff";
          return assets.map(asset => {
            const reading = layerReadings?.get(asset.assetId) || null;
            const riskLevel = getRiskLevelFromReading(reading);
            return (
              <CircleMarker
                key={asset.assetId}
                center={[asset.lat, asset.lng]}
                radius={7}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1.5 }}
              >
                <Tooltip>
                  <span style={{ fontWeight: 700 }}>{asset.name}</span><br />
                  <span>Zone: {asset.zone}</span><br />
                  <span>Type: {asset.infraType}</span><br />
                  <span>Risk: {riskLevel}</span>
                </Tooltip>
              </CircleMarker>
            );
          });
        })}
      </MapContainer>

      {/* Infrastructure toggle — floats top-right inside map */}
      {onInfraChange && (
        <InfrastructureToggle active={activeInfra || "power"} onChange={onInfraChange} />
      )}

      {/* Legend — updates per active layer */}
      {(() => {
        const legend = INFRA_LEGENDS[activeInfra || "power"] || INFRA_LEGENDS.power;
        return (
          <div style={{
            position: "absolute", bottom: 12, left: 12, zIndex: 1000,
            background: "rgba(11,15,26,0.92)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 12px", fontSize: 11,
          }}>
            <div style={{ color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>{legend.title}</div>
            {legend.items.map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                <span style={{ color: "var(--text-muted)" }}>{l}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, color: "var(--text-muted)" }}>
              {legend.footer}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
