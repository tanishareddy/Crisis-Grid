import { useState } from "react";
import { Brain, CheckCircle, AlertTriangle, Zap, Users, Wrench, Navigation, Loader, Sparkles } from "lucide-react";
import BangaloreMap from "../components/BangaloreMap";
import { SUBSTATIONS } from "../data/bangaloreData";
import { useBedrock } from "../hooks/useBedrock";
import { useDynamo } from "../hooks/useDynamo";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

const INFRA_COLORS = {
  power: "#3A86FF",
  water: "#00E5FF",
  gas: "#f59e0b",
  communications: "#a855f7",
  physical: "#39FF14",
};

const FALLBACK_PLANS = {
  water: [
    "Dispatch field crew to inspect pressure drop",
    "Check for pipeline rupture",
    "Notify water board operations",
  ],
  gas: [
    "Evacuate 100m radius immediately",
    "Shut off gas supply valve",
    "Contact emergency services",
  ],
  communications: [
    "Switch to backup backhaul link",
    "Notify network operations center",
    "Deploy mobile unit if needed",
  ],
  physical: [
    "Restrict access to structure",
    "Deploy structural inspection team",
    "File incident report",
  ],
};

const IMPACT_HEURISTIC = {
  critical: { population: 50000, zones: "All zones" },
  high:     { population: 20000, zones: "3 zones" },
  medium:   { population: 5000,  zones: "1 zone" },
  low:      { population: 1000,  zones: "1 zone" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_ICONS = {
  "IMMEDIATE": AlertTriangle, "POWER": Zap, "LOAD": Zap, "SWITCHING": Zap,
  "COOLING": Wrench, "FREQUENCY": Zap, "VOLTAGE": Zap, "EARTH": AlertTriangle,
  "Deploy": Wrench, "Schedule": Wrench, "Notify": Users, "Check": CheckCircle,
  "Monitor": CheckCircle, "Activate": CheckCircle, "Reduce": Wrench,
  "Coordinate": Users, "Alert": Users, "Backup": CheckCircle,
  "All": CheckCircle, "Continue": CheckCircle, "Log": CheckCircle,
  "Issue": Users, "Update": CheckCircle, "Safety": AlertTriangle,
  "Isolate": AlertTriangle, "Dispatch": Wrench, "Evacuate": AlertTriangle,
  "Switch": Wrench, "Restrict": AlertTriangle, "Contact": Users, "File": CheckCircle,
};

function getActionIcon(action) {
  const word = action.split(":")[0].split(" ")[0];
  return ACTION_ICONS[word] || CheckCircle;
}

function severityColor(severity) {
  if (severity === "critical") return "var(--red)";
  if (severity === "high")     return "var(--red)";
  if (severity === "medium")   return "var(--amber)";
  return "var(--green)";
}

// ─── Active Events Panel ──────────────────────────────────────────────────────

function ActiveEventsPanel({ events, selectedEventId, onSelect }) {
  const visible = (events || [])
    .filter(e => !e.resolved)
    .sort((a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0));

  return (
    <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>
        Active Events ({visible.length})
      </div>
      {visible.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
          No active events
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
          {visible.map(evt => {
            const color = severityColor(evt.severity);
            const infraColor = INFRA_COLORS[evt.infraType] || "var(--blue)";
            const isSelected = selectedEventId === evt.eventId;
            return (
              <button
                key={evt.eventId}
                onClick={() => onSelect(evt)}
                style={{
                  background: isSelected ? `${color}18` : "var(--bg)",
                  border: `1px solid ${isSelected ? color : "var(--border)"}`,
                  color: isSelected ? color : "var(--text)",
                  borderRadius: 7, padding: "8px 10px", cursor: "pointer",
                  fontSize: 11, textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 3,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{evt.description}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    background: `${color}22`, border: `1px solid ${color}44`,
                    borderRadius: 4, padding: "1px 5px", color,
                  }}>
                    {evt.severity}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    fontSize: 9, background: `${infraColor}22`, border: `1px solid ${infraColor}44`,
                    borderRadius: 4, padding: "1px 5px", color: infraColor, fontWeight: 600,
                  }}>
                    {evt.infraType}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{evt.zone}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Impact Overview ──────────────────────────────────────────────────────────

function ImpactOverview({ event }) {
  if (!event) return null;
  const h = IMPACT_HEURISTIC[event.severity] || IMPACT_HEURISTIC.low;
  return (
    <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>
        Impact Overview
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>POPULATION AFFECTED</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            ~{h.population.toLocaleString()}
          </div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>IMPACTED ZONES</div>
          <div style={{ fontSize: 12, color: "var(--text)" }}>{h.zones}</div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>INFRA TYPE</div>
          <div style={{ fontSize: 12, color: INFRA_COLORS[event.infraType] || "var(--blue)", fontWeight: 600 }}>
            {event.infraType}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Action Plan (non-power) ───────────────────────────────────────────────

function AIActionPlan({ event, bedrockResult, loading }) {
  if (!event) return null;

  const actions = bedrockResult?.immediate_actions
    || FALLBACK_PLANS[event.infraType]
    || ["Assess situation", "Notify relevant authorities", "Monitor for escalation"];

  const isFallback = !bedrockResult?.immediate_actions;

  return (
    <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>AI Action Plan</div>
        {isFallback && (
          <span style={{ fontSize: 9, background: "rgba(255,176,32,0.15)", border: "1px solid var(--amber)44", borderRadius: 4, padding: "1px 6px", color: "var(--amber)" }}>
            LOCAL FALLBACK
          </span>
        )}
        {loading && <Loader size={12} color="var(--cyan)" style={{ animation: "spin 1s linear infinite" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map((action, i) => {
          const Icon = getActionIcon(action);
          return (
            <div key={i} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              background: "rgba(0,229,255,0.05)", border: "1px solid var(--cyan)22",
              borderRadius: 7, padding: "8px 10px",
            }}>
              <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 700, minWidth: 16 }}>{i + 1}.</span>
              <Icon size={12} color="var(--cyan)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{action}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Non-Power AI Analysis Panel ─────────────────────────────────────────────

function NonPowerAnalysisPanel({ event, bedrockResult, loading, onAnalyze }) {
  if (!event) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Analyze button */}
      <button onClick={onAnalyze} disabled={loading} style={{
        background: loading ? "rgba(0,229,255,0.08)" : "rgba(0,229,255,0.12)",
        border: "1px solid var(--cyan)", color: "var(--cyan)",
        borderRadius: 10, padding: "12px", cursor: loading ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        {loading ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
        {loading ? "Asking Bedrock Claude..." : "✨ Get AI Analysis (Bedrock)"}
      </button>

      {/* Bedrock result */}
      {bedrockResult && (
        <div className="animate-fade" style={{
          background: "var(--panel)", borderRadius: 12,
          border: "1px solid var(--cyan)44", padding: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Sparkles size={15} color="var(--cyan)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--cyan)" }}>Bedrock AI Analysis</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", background: "var(--bg)", borderRadius: 4, padding: "2px 6px" }}>
              {bedrockResult.source === "bedrock" ? "Claude 3 Haiku · Live" : "Local Analysis"}
            </span>
          </div>

          <div style={{ background: "var(--bg)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>TECHNICAL ANALYSIS</div>
            <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>{bedrockResult.analysis}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(255,59,59,0.08)", border: "1px solid var(--red)22", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 700, marginBottom: 4 }}>CASCADE RISK</div>
              <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{bedrockResult.cascade_risk}</div>
            </div>
            <div style={{ background: "rgba(57,255,20,0.06)", border: "1px solid var(--green)22", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 700, marginBottom: 4 }}>EST. RESTORATION</div>
              <div style={{ fontSize: 12, color: "var(--text)" }}>{bedrockResult.estimated_restoration}</div>
            </div>
          </div>
        </div>
      )}

      <ImpactOverview event={event} />
      <AIActionPlan event={event} bedrockResult={bedrockResult} loading={loading} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DecisionSupport({ substationData, emergencyMode, activeEvents = [] }) {
  // Power-specific state
  const [selectedId, setSelectedId] = useState(null);
  const [rerouteAnimation, setRerouteAnimation] = useState({ active: false });
  const { analyze, loading, result: bedrockResult, clear } = useBedrock();

  // Cross-infra event state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventBedrockResult, setEventBedrockResult] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const { writeEvent } = useDynamo();

  // Power anomalies (existing logic)
  const anomalies = Object.values(substationData || {}).filter(z => z.is_anomaly)
    .sort((a, b) => b.failure_probability - a.failure_probability);

  const displayData = selectedId ? substationData?.[selectedId] : anomalies[0];

  const handleSelectZone = (id) => {
    setSelectedId(id);
    setSelectedEvent(null);
    setEventBedrockResult(null);
    clear();
  };

  const handleAnalyze = async () => {
    if (!displayData) return;
    await analyze(displayData);
  };

  const handleSimulate = () => {
    if (!displayData?.decision_support?.recovery_simulation) return;
    const { zone, reroute_to } = displayData.decision_support.recovery_simulation;
    setRerouteAnimation({ active: true, faultedId: zone, rerouteTo: reroute_to });
    setTimeout(() => setRerouteAnimation({ active: false }), 6000);
  };

  const handleSelectEvent = async (evt) => {
    setSelectedEvent(evt);
    setEventBedrockResult(null);
    setSelectedId(null);
    clear();

    // Write event to DynamoDB (Req 9.4)
    writeEvent(evt);

    // If it's a power event, map to substation selection
    if (evt.infraType === "power") {
      setSelectedId(evt.assetId);
    }
  };

  const handleAnalyzeEvent = async () => {
    if (!selectedEvent) return;
    setEventLoading(true);
    try {
      // Build structured context for Bedrock (Req 8.8)
      const context = {
        substation_id: selectedEvent.assetId,
        substation_name: selectedEvent.description,
        fault_type: selectedEvent.infraType + "_event",
        failure_probability: SEVERITY_ORDER[selectedEvent.severity] / 4,
        severity: selectedEvent.severity,
        sensor_readings: {
          infraType: selectedEvent.infraType,
          zone: selectedEvent.zone,
          description: selectedEvent.description,
          timestamp: selectedEvent.timestamp,
        },
      };
      const result = await analyze(context);
      setEventBedrockResult(result);
    } finally {
      setEventLoading(false);
    }
  };

  const sub = SUBSTATIONS.find(s => s.id === displayData?.substation_id);
  const isPowerEventSelected = selectedEvent?.infraType === "power";
  const isNonPowerEventSelected = selectedEvent && !isPowerEventSelected;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Brain size={18} color="var(--cyan)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>AI Decision Support</h2>
          <span style={{ fontSize: 11, background: "rgba(58,134,255,0.15)", border: "1px solid var(--blue)", borderRadius: 10, padding: "2px 8px", color: "var(--blue)" }}>
            Powered by Amazon Bedrock · Claude 3 Haiku
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Real-time AI analysis across all infrastructure types with rerouting simulation
        </p>
      </div>

      {/* emergency banner */}
      {emergencyMode && (
        <div className="animate-fade" style={{
          background: "rgba(255,59,59,0.12)", border: "1px solid var(--red)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 16,
          animation: "pulse-red 2s infinite",
        }}>
          <div style={{ color: "var(--red)", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            ⚠ EMERGENCY MODE — Critical Infrastructure Power Priority
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["🏥 NIMHANS · Bowring · Manipal", "🛡 Cantonment · Yelahanka AF", "💧 Tata Water · Cauvery Works", "🏘 Residential Blocks"].map(f => (
              <span key={f} style={{ background: "rgba(255,59,59,0.2)", border: "1px solid var(--red)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--red)" }}>
                {f} — PRIORITY POWER
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Active Events Panel — above substation selector (Req 8.1) */}
          <ActiveEventsPanel
            events={activeEvents}
            selectedEventId={selectedEvent?.eventId}
            onSelect={handleSelectEvent}
          />

          {/* zone selector (existing power feature — Req 8.7) */}
          <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>Select Substation</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 200, overflowY: "auto" }}>
              {SUBSTATIONS.map(s => {
                const d = substationData?.[s.id];
                const color = d?.severity === "critical" ? "var(--red)" : d?.severity === "high" ? "var(--red)" : d?.severity === "medium" ? "var(--amber)" : "var(--green)";
                const isSelected = selectedId === s.id && !selectedEvent;
                return (
                  <button key={s.id} onClick={() => handleSelectZone(s.id)} style={{
                    background: isSelected ? `${color}18` : "var(--bg)",
                    border: `1px solid ${isSelected ? color : "var(--border)"}`,
                    color: isSelected ? color : "var(--text-muted)",
                    borderRadius: 7, padding: "7px 12px", cursor: "pointer",
                    fontSize: 12, textAlign: "left",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <span>⚡ {s.shortName}</span>
                    <span style={{ fontSize: 10 }}>{d ? `${(d.failure_probability * 100).toFixed(0)}% risk` : "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BESCOM protocol actions (existing power feature — Req 8.7) */}
          {displayData && !isNonPowerEventSelected && (
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>
                BESCOM Protocol Actions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {displayData.decision_support?.actions?.map((action, i) => {
                  const isUrgent = /^(IMMEDIATE|POWER REROUTE|EARTH FAULT)/.test(action);
                  const Icon = getActionIcon(action);
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 8, alignItems: "flex-start",
                      background: isUrgent ? "rgba(255,59,59,0.08)" : "var(--bg)",
                      border: `1px solid ${isUrgent ? "var(--red)" : "var(--border)"}22`,
                      borderRadius: 7, padding: "8px 10px",
                    }}>
                      <Icon size={12} color={isUrgent ? "var(--red)" : "var(--cyan)"} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: isUrgent ? "var(--red)" : "var(--text)", lineHeight: 1.4 }}>{action}</span>
                    </div>
                  );
                })}
              </div>

              {/* simulate reroute (Req 8.7) */}
              {displayData.decision_support?.recovery_simulation && (
                <button onClick={handleSimulate} style={{
                  width: "100%",
                  background: rerouteAnimation.active ? "rgba(0,229,255,0.12)" : "rgba(58,134,255,0.12)",
                  border: `1px solid ${rerouteAnimation.active ? "var(--cyan)" : "var(--blue)"}`,
                  color: rerouteAnimation.active ? "var(--cyan)" : "var(--blue)",
                  borderRadius: 8, padding: "9px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10,
                }}>
                  <Navigation size={12} />
                  {rerouteAnimation.active ? "Simulating on Map..." : "▶ Simulate Power Rerouting"}
                </button>
              )}

              {/* citizen notification (Req 8.7) */}
              {displayData.decision_support?.citizen_notification && (
                <div style={{ background: "rgba(255,176,32,0.08)", border: "1px solid var(--amber)33", borderRadius: 7, padding: "9px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--amber)", fontWeight: 700, marginBottom: 4 }}>📱 BESCOM CITIZEN NOTIFICATION</div>
                  <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>{displayData.decision_support.citizen_notification}</div>
                </div>
              )}
            </div>
          )}

          {/* Bedrock AI analysis button for power (Req 8.7) */}
          {displayData?.is_anomaly && !isNonPowerEventSelected && (
            <button onClick={handleAnalyze} disabled={loading} style={{
              background: loading ? "rgba(0,229,255,0.08)" : "rgba(0,229,255,0.12)",
              border: "1px solid var(--cyan)", color: "var(--cyan)",
              borderRadius: 10, padding: "12px", cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              {loading ? "Asking Bedrock Claude..." : "✨ Get AI Analysis (Bedrock)"}
            </button>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Non-power event analysis (Req 8.2, 8.4, 8.5, 8.6, 8.8) */}
          {isNonPowerEventSelected && (
            <NonPowerAnalysisPanel
              event={selectedEvent}
              bedrockResult={eventBedrockResult}
              loading={eventLoading}
              onAnalyze={handleAnalyzeEvent}
            />
          )}

          {/* Power Bedrock result (existing — Req 8.7) */}
          {bedrockResult && !isNonPowerEventSelected && (
            <div className="animate-fade" style={{
              background: "var(--panel)", borderRadius: 12,
              border: "1px solid var(--cyan)44", padding: 18,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Sparkles size={15} color="var(--cyan)" />
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--cyan)" }}>Bedrock AI Analysis</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", background: "var(--bg)", borderRadius: 4, padding: "2px 6px" }}>
                  {bedrockResult.source === "bedrock" ? "Claude 3 Haiku · Live" : "Local Analysis"}
                </span>
              </div>

              <div style={{ background: "var(--bg)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>TECHNICAL ANALYSIS</div>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>{bedrockResult.analysis}</p>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>AI RECOMMENDED ACTIONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bedrockResult.immediate_actions?.map((action, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 8, alignItems: "flex-start",
                      background: "rgba(0,229,255,0.05)", border: "1px solid var(--cyan)22",
                      borderRadius: 7, padding: "8px 10px",
                    }}>
                      <CheckCircle size={12} color="var(--cyan)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "rgba(255,59,59,0.08)", border: "1px solid var(--red)22", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 700, marginBottom: 4 }}>CASCADE RISK</div>
                  <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{bedrockResult.cascade_risk}</div>
                </div>
                <div style={{ background: "rgba(57,255,20,0.06)", border: "1px solid var(--green)22", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 700, marginBottom: 4 }}>EST. RESTORATION</div>
                  <div style={{ fontSize: 12, color: "var(--text)" }}>{bedrockResult.estimated_restoration}</div>
                </div>
              </div>

              {bedrockResult.citizen_message && (
                <div style={{ background: "rgba(255,176,32,0.08)", border: "1px solid var(--amber)33", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--amber)", fontWeight: 700, marginBottom: 4 }}>📱 AI-GENERATED CITIZEN ALERT</div>
                  <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{bedrockResult.citizen_message}</div>
                </div>
              )}
            </div>
          )}

          {/* map */}
          <BangaloreMap substationData={substationData} emergencyMode={emergencyMode} rerouteAnimation={rerouteAnimation} />

          {rerouteAnimation.active && (
            <div className="animate-fade" style={{
              background: "rgba(0,229,255,0.08)", border: "1px solid var(--cyan)",
              borderRadius: 8, padding: "10px 14px",
            }}>
              <div style={{ color: "var(--cyan)", fontWeight: 600, fontSize: 13 }}>⟳ Power Rerouting Simulation Active</div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                Transferring load from {SUBSTATIONS.find(s => s.id === rerouteAnimation.faultedId)?.shortName} →{" "}
                {rerouteAnimation.rerouteTo?.map(id => SUBSTATIONS.find(s => s.id === id)?.shortName).join(", ")}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
