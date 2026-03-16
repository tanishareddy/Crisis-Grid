import { useState, useEffect, useRef } from "react";
import { Zap, AlertTriangle, CheckCircle, Play, RotateCcw, Users } from "lucide-react";
import BangaloreMap from "../components/BangaloreMap";
import { SUBSTATIONS } from "../data/bangaloreData";
import { simulateCascade, getCascadeImpact } from "../data/cascadeEngine";

const STATUS_COLOR = {
  faulted:    "#FF3B3B",
  overloaded: "#FFB020",
  rerouted:   "#00E5FF",
  normal:     "#39FF14",
};

export default function CascadeSimulation({ substationData }) {
  const [selectedSub, setSelectedSub] = useState(null);
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [impact, setImpact] = useState(null);
  const timerRefs = useRef([]);

  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  const handleSelect = (subId) => {
    clearTimers();
    setSelectedSub(subId);
    setFrames([]);
    setCurrentFrame(0);
    setRunning(false);
    setDone(false);
    setImpact(getCascadeImpact(subId));
  };

  const handleRun = () => {
    if (!selectedSub) return;
    const f = simulateCascade(selectedSub, substationData);
    setFrames(f);
    setCurrentFrame(0);
    setRunning(true);
    setDone(false);

    f.forEach((frame, i) => {
      const t = setTimeout(() => {
        setCurrentFrame(i);
        if (i === f.length - 1) { setRunning(false); setDone(true); }
      }, frame.delay);
      timerRefs.current.push(t);
    });
  };

  const handleReset = () => {
    clearTimers();
    setFrames([]);
    setCurrentFrame(0);
    setRunning(false);
    setDone(false);
  };

  // build substationData override for map during simulation
  const simulatedData = (() => {
    if (!frames.length) return substationData;
    const frame = frames[currentFrame] || frames[0];
    const overrides = { ...substationData };

    frame.faulted?.forEach(id => {
      overrides[id] = { ...overrides[id], severity: "critical", is_anomaly: true, fault_type: "short_circuit" };
    });
    frame.overloaded?.forEach(id => {
      overrides[id] = { ...overrides[id], severity: "high", is_anomaly: true, fault_type: "overload" };
    });
    frame.rerouted?.forEach(id => {
      overrides[id] = { ...overrides[id], severity: "medium", is_anomaly: false };
    });

    return overrides;
  })();

  const rerouteAnimation = frames.length && frames[currentFrame]
    ? {
        active: running || done,
        faultedId: selectedSub,
        rerouteTo: frames[currentFrame].rerouted || [],
      }
    : { active: false };

  const frame = frames[currentFrame];

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={18} color="var(--red)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Cascade Failure Simulation</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Select a BESCOM substation and simulate a cascade failure across Bangalore's power grid
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* left controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* substation picker */}
          <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>
              1. Select Fault Origin
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
              {SUBSTATIONS.map(sub => {
                const d = substationData?.[sub.id];
                const risk = d?.failure_probability || 0;
                const isSelected = selectedSub === sub.id;
                const riskColor = risk > 0.6 ? "var(--red)" : risk > 0.35 ? "var(--amber)" : "var(--green)";
                return (
                  <button key={sub.id} onClick={() => handleSelect(sub.id)} style={{
                    background: isSelected ? "rgba(255,59,59,0.12)" : "var(--bg)",
                    border: `1px solid ${isSelected ? "var(--red)" : "var(--border)"}`,
                    color: isSelected ? "var(--red)" : "var(--text-muted)",
                    borderRadius: 7, padding: "7px 12px", cursor: "pointer",
                    fontSize: 12, textAlign: "left",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>⚡ {sub.shortName} <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({sub.voltage_kv}kV)</span></span>
                    <span style={{ fontSize: 10, color: riskColor, fontWeight: 600 }}>{(risk * 100).toFixed(0)}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* impact preview */}
          {impact && selectedSub && (
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--amber)44", padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, marginBottom: 10 }}>
                Predicted Impact
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Substations affected</span>
                  <span style={{ color: "var(--red)", fontWeight: 700 }}>{impact.substations_affected}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Est. population</span>
                  <span style={{ color: "var(--amber)", fontWeight: 700 }}>{impact.estimated_population.toLocaleString("en-IN")}</span>
                </div>
                {impact.facilities_at_risk.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Critical facilities at risk:</div>
                    {impact.facilities_at_risk.map(f => (
                      <div key={f} style={{ fontSize: 11, color: "var(--red)", marginBottom: 2 }}>⚠ {f}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* controls */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleRun} disabled={!selectedSub || running} style={{
              flex: 1, background: running ? "rgba(255,59,59,0.08)" : "rgba(255,59,59,0.15)",
              border: "1px solid var(--red)", color: "var(--red)",
              borderRadius: 8, padding: "10px", cursor: selectedSub && !running ? "pointer" : "not-allowed",
              fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: !selectedSub ? 0.5 : 1,
            }}>
              <Play size={13} />
              {running ? "Simulating..." : "Run Cascade"}
            </button>
            <button onClick={handleReset} style={{
              background: "var(--bg)", border: "1px solid var(--border)",
              color: "var(--text-muted)", borderRadius: 8, padding: "10px 14px",
              cursor: "pointer", fontSize: 12,
            }}>
              <RotateCcw size={13} />
            </button>
          </div>

          {/* step log */}
          {frames.length > 0 && (
            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>Event Log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {frames.map((f, i) => {
                  const isPast    = i < currentFrame;
                  const isCurrent = i === currentFrame;
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 8, alignItems: "flex-start",
                      opacity: isPast ? 0.5 : 1,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                        background: isCurrent ? "var(--cyan)" : isPast ? "var(--green)" : "var(--border)",
                        animation: isCurrent ? "pulse-red 1s infinite" : "none",
                      }} />
                      <span style={{ fontSize: 11, color: isCurrent ? "var(--cyan)" : "var(--text-muted)", lineHeight: 1.4 }}>
                        {f.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* right — map + description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <BangaloreMap
            substationData={simulatedData}
            emergencyMode={frame?.faulted?.length > 0 && (running || done)}
            rerouteAnimation={rerouteAnimation}
          />

          {/* current frame description */}
          {frame && (
            <div className="animate-fade" style={{
              background: "var(--panel)", borderRadius: 10,
              border: `1px solid ${done ? "var(--green)" : running ? "var(--red)" : "var(--border)"}44`,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {done
                  ? <CheckCircle size={14} color="var(--green)" />
                  : <AlertTriangle size={14} color="var(--red)" />}
                <span style={{ fontWeight: 600, fontSize: 13, color: done ? "var(--green)" : "var(--cyan)" }}>
                  {frame.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{frame.description}</p>

              {frame.facilitiesAffected?.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {frame.facilitiesAffected.map(f => (
                    <span key={f} style={{ background: "rgba(255,59,59,0.1)", border: "1px solid var(--red)44", borderRadius: 5, padding: "3px 8px", fontSize: 10, color: "var(--red)" }}>
                      ⚠ {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* legend */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[["#FF3B3B","Faulted"],["#FFB020","Overloaded"],["#00E5FF","Rerouting"],["#39FF14","Normal"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
