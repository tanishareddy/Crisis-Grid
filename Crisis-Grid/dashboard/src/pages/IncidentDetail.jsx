/**
 * Incident Detail Page
 * Displays full incident info, auto-generated solution, and resolve action.
 */
import { useState } from "react";
import {
  ArrowLeft, AlertTriangle, CheckCircle, Clock, MapPin,
  Zap, Droplets, Flame, Shield, User, Calendar, Lightbulb,
  CheckSquare, XCircle,
} from "lucide-react";
import { SUBSTATIONS } from "../data/bangaloreData";
import { generateSolution, faultTypeToSolution } from "../data/incidentSolutions";
import { useToast } from "../context/AppContext";

// ── Config maps ───────────────────────────────────────────────────────────────
const STATUS_CFG = {
  open:          { color: "var(--red)",    icon: XCircle,       label: "Open" },
  investigating: { color: "var(--amber)",  icon: Clock,         label: "Investigating" },
  resolved:      { color: "var(--green)",  icon: CheckCircle,   label: "Resolved" },
};

const SEV_CFG = {
  critical: { color: "var(--red)",    cls: "badge-red",    label: "Critical" },
  high:     { color: "var(--red)",    cls: "badge-red",    label: "High" },
  medium:   { color: "var(--amber)",  cls: "badge-amber",  label: "Medium" },
  low:      { color: "var(--green)",  cls: "badge-green",  label: "Low" },
};

const INFRA_ICONS = { power: Zap, water: Droplets, gas: Flame, general: Shield };
const INFRA_COLORS = { power: "var(--blue)", water: "var(--cyan)", gas: "var(--amber)", general: "var(--purple)" };

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <Icon size={15} color={color || "var(--text-muted)"} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{value || "—"}</div>
      </div>
    </div>
  );
}

function SolutionStep({ step, index }) {
  const [done, setDone] = useState(false);
  return (
    <div
      className="animate-slide-up"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "12px 14px", borderRadius: 8,
        background: done ? "var(--green-dim)" : "var(--bg2)",
        border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
        transition: "all 0.25s",
        animationDelay: `${index * 0.06}s`,
        cursor: "pointer",
      }}
      onClick={() => setDone(d => !d)}
    >
      <div style={{
        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
        background: done ? "var(--green)" : "var(--panel2)",
        border: `2px solid ${done ? "var(--green)" : "var(--border2)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}>
        {done
          ? <CheckCircle size={13} color="#fff" />
          : <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{index + 1}</span>
        }
      </div>
      <span style={{ fontSize: 13, color: done ? "var(--text-muted)" : "var(--text)", textDecoration: done ? "line-through" : "none", lineHeight: 1.5 }}>
        {step}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IncidentDetail({ incident, onBack, onUpdate }) {
  const [resolving, setResolving] = useState(false);
  const { addToast } = useToast();

  if (!incident) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <AlertTriangle size={40} color="var(--text-muted)" style={{ display: "block", margin: "0 auto 16px" }} />
        <div style={{ color: "var(--text-muted)", fontSize: 15 }}>Incident not found</div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={onBack}>
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  // Determine solution — use infraType + type from incident, or fall back to fault_type
  const infraType = incident.infraType || faultTypeToSolution(incident.fault_type)?.infra || "power";
  const incType   = incident.type      || faultTypeToSolution(incident.fault_type)?.type  || "";
  const solution  = generateSolution(infraType, incType);

  const sub = SUBSTATIONS.find(s => s.id === incident.substation_id || s.id === incident.substation);
  const stCfg  = STATUS_CFG[incident.status] || STATUS_CFG.open;
  const sevCfg = SEV_CFG[incident.severity]  || SEV_CFG.medium;
  const InfraIcon  = INFRA_ICONS[infraType]  || Shield;
  const infraColor = INFRA_COLORS[infraType] || "var(--blue)";
  const StIcon = stCfg.icon;

  const handleResolve = async () => {
    setResolving(true);
    await new Promise(r => setTimeout(r, 600));
    onUpdate?.(incident.id, { status: "resolved" });
    addToast(`Incident "${incident.title || incident.type}" marked as resolved`, "success");
    setResolving(false);
  };

  const isResolved = incident.status === "resolved";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860, margin: "0 auto" }} className="animate-fade">

      {/* ── Back + Header ── */}
      <div>
        <button className="btn btn-ghost" style={{ marginBottom: 16, padding: "6px 12px" }} onClick={onBack}>
          <ArrowLeft size={14} /> Back to Incidents
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: `${infraColor}18`,
              border: `1px solid ${infraColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <InfraIcon size={22} color={infraColor} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
                {incident.title || incident.type || "Infrastructure Incident"}
              </h1>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {incident.id} · {new Date(incident.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`badge ${sevCfg.cls}`} style={{ fontSize: 12, padding: "4px 12px" }}>
              {sevCfg.label}
            </span>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 20,
              background: `${stCfg.color}18`,
              border: `1px solid ${stCfg.color}44`,
              fontSize: 12, fontWeight: 600, color: stCfg.color,
            }}>
              <StIcon size={13} />
              {stCfg.label}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Left — Incident Details */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Incident Details</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Reported information</div>

          <InfoRow icon={InfraIcon}     label="Infrastructure"  value={infraType.charAt(0).toUpperCase() + infraType.slice(1)} color={infraColor} />
          <InfoRow icon={AlertTriangle} label="Incident Type"   value={incident.type} color={sevCfg.color} />
          <InfoRow icon={MapPin}        label="Location"        value={incident.location || sub?.name || sub?.area || "Not specified"} color="var(--blue)" />
          <InfoRow icon={Calendar}      label="Reported At"     value={new Date(incident.timestamp).toLocaleString("en-IN")} />
          <InfoRow icon={User}          label="Reported By"     value={`${incident.reporter}${incident.contact ? ` · ${incident.contact}` : ""}`} />
          {sub && (
            <InfoRow icon={Zap} label="Substation" value={`${sub.name} · ${sub.voltage_kv}kV · ${sub.capacity_mva} MVA`} color="var(--cyan)" />
          )}

          {/* Description */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 500 }}>Description</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, background: "var(--bg2)", borderRadius: 8, padding: "10px 12px" }}>
              {incident.description || "No description provided."}
            </div>
          </div>

          {/* Resolve button */}
          {!isResolved && (
            <button
              className="btn btn-success"
              style={{ width: "100%", marginTop: 16, justifyContent: "center" }}
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? (
                <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid var(--green)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : <CheckSquare size={14} />}
              {resolving ? "Marking resolved..." : "Mark as Resolved"}
            </button>
          )}
          {isResolved && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={15} color="var(--green)" />
              <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>Incident Resolved</span>
            </div>
          )}
        </div>

        {/* Right — Solution */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Lightbulb size={16} color="var(--amber)" />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Suggested Solution</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            Auto-generated mitigation steps · click each step to mark complete
          </div>

          {/* Meta */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ padding: "4px 10px", background: "var(--bg2)", borderRadius: 6, fontSize: 11 }}>
              <span style={{ color: "var(--text-muted)" }}>Est. time: </span>
              <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{solution.estimatedTime}</span>
            </div>
            <div style={{ padding: "4px 10px", background: "var(--bg2)", borderRadius: 6, fontSize: 11 }}>
              <span style={{ color: "var(--text-muted)" }}>Priority: </span>
              <span style={{ color: solution.priority === "Critical" || solution.priority === "Immediate" ? "var(--red)" : solution.priority === "High" ? "var(--amber)" : "var(--green)", fontWeight: 600 }}>
                {solution.priority}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {solution.steps.map((step, i) => (
              <SolutionStep key={i} step={step} index={i} />
            ))}
          </div>

          <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--blue-dim)", borderRadius: 8, fontSize: 11, color: "var(--text-muted)", borderLeft: "3px solid var(--blue)" }}>
            These steps are auto-generated based on incident type. Always follow BESCOM / BWSSB / GAIL safety protocols.
          </div>
        </div>
      </div>
    </div>
  );
}
