/**
 * DisasterModeOverlay — adds disaster layers on top of BangaloreMap
 * Accepts scenario data as props (from DisasterModePanel selection)
 * Falls back to empty when no scenario is active
 */
import { Circle, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { SEVERITY_ZONE_COLORS, TEAM_ICONS } from "../data/disasterData";

export default function DisasterModeOverlay({ active, scenario }) {
  if (!active || !scenario) return null;

  const { affectedZones = [], predictedZones = [], routes = [], hospitals = [] } = scenario;

  return (
    <>
      {/* Affected zones */}
      {affectedZones.map(zone => {
        const colors = SEVERITY_ZONE_COLORS[zone.severity] || SEVERITY_ZONE_COLORS.medium;
        return (
          <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={zone.radius}
            pathOptions={{ color: colors.stroke, fillColor: colors.stroke, fillOpacity: 0.2, weight: 2, dashArray: "6 3" }}
          >
            <Tooltip sticky>
              <strong>⚠ {zone.name}</strong><br />
              Severity: <span style={{ color: colors.stroke, fontWeight: 700 }}>{zone.severity.toUpperCase()}</span><br />
              ~{(zone.population || 0).toLocaleString()} affected
            </Tooltip>
          </Circle>
        );
      })}

      {/* Predicted zones — orange dashed */}
      {predictedZones.map(pred => (
        <Circle key={pred.id} center={[pred.lat, pred.lng]} radius={750}
          pathOptions={{ color: "#FF8C00", fillColor: "rgba(255,140,0,0.1)", fillOpacity: 1, weight: 2, dashArray: "8 5" }}
        >
          <Tooltip sticky>
            <strong style={{ color: "#FF8C00" }}>🟠 {pred.name}</strong><br />
            Risk: {Math.round(pred.risk * 100)}% · ETA: {pred.eta}
          </Tooltip>
        </Circle>
      ))}

      {/* Evacuation routes */}
      {routes.map(route => (
        <Polyline key={route.id} positions={route.waypoints}
          pathOptions={{ color: route.color, weight: 4, opacity: 0.9, dashArray: "10 5" }}
        >
          <Tooltip sticky>🚗 <strong>{route.name}</strong> · ETA {route.eta}</Tooltip>
        </Polyline>
      ))}

      {/* Hospitals */}
      {hospitals.map(h => (
        <CircleMarker key={h.id} center={[h.lat, h.lng]} radius={8}
          pathOptions={{ color: "#00E5FF", fillColor: "#00E5FF", fillOpacity: 0.85, weight: 2 }}
        >
          <Tooltip>🏥 <strong>{h.name}</strong><br />{h.beds} beds · {h.distance}</Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
