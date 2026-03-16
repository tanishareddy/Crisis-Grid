/**
 * Incident Reporting Modal
 *
 * FIX: Field component is defined OUTSIDE IncidentReportModal so it is never
 * recreated on each render — this prevents input focus loss on every keystroke.
 */
import { useState, useCallback } from "react";
import { Send, CheckCircle } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "../context/AppContext";
import { SUBSTATIONS } from "../data/bangaloreData";

// ── Field wrapper — defined at module level to avoid re-creation ──────────────
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginBottom: 5, fontWeight: 500 }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

const INCIDENT_TYPES = [
  "Power Outage", "Transformer Fault", "Line Damage", "Overload",
  "Equipment Failure", "Pipe Burst", "Pressure Drop", "Contamination",
  "Gas Leak", "Pressure Deviation", "Vandalism", "Natural Disaster",
  "Planned Maintenance", "Other",
];
const INFRA_TYPES  = ["power", "water", "gas", "general"];
const SEVERITY_OPTS = ["low", "medium", "high", "critical"];

const EMPTY_FORM = {
  title: "",
  type: "",
  infraType: "power",
  substation: "",
  location: "",
  severity: "medium",
  description: "",
  reporter: "",
  contact: "",
};

export default function IncidentReportModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  // Stable setter — does NOT recreate Field or cause parent re-renders
  const set = useCallback((k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => prev[k] ? { ...prev, [k]: null } : prev);
  }, []);

  const validate = () => {
    const e = {};
    if (!form.title.trim())       e.title = "Title is required";
    if (!form.type)               e.type = "Select incident type";
    if (!form.infraType)          e.infraType = "Select infrastructure type";
    if (!form.description.trim() || form.description.length < 10)
                                  e.description = "Provide at least 10 characters";
    if (!form.reporter.trim())    e.reporter = "Reporter name is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    await new Promise(r => setTimeout(r, 700));

    const incident = {
      ...form,
      id: `INC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: "open",
      isNew: true,
    };

    onSubmit?.(incident);
    addToast(`Incident "${incident.title}" submitted successfully`, "success");
    setSubmitted(true);

    // reset after brief success flash
    setTimeout(() => {
      setForm(EMPTY_FORM);
      setErrors({});
      setSubmitting(false);
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  const handleClose = () => {
    if (submitting) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  // Success state
  if (submitted) {
    return (
      <Modal open={open} onClose={handleClose} title="Incident Reported" width={420}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <CheckCircle size={48} color="var(--green)" style={{ display: "block", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            Report Submitted
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Your incident has been logged and the team has been notified.
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report Infrastructure Incident" width={540}>
      <form onSubmit={handleSubmit} noValidate>

        {/* Title */}
        <Field label="Incident Title *" error={errors.title}>
          <input
            className="input"
            placeholder="e.g. Transformer overheating at Peenya"
            value={form.title}
            onChange={e => set("title", e.target.value)}
            autoFocus
          />
        </Field>

        {/* Type + Infrastructure */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Incident Type *" error={errors.type}>
            <select className="select" style={{ width: "100%" }} value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="">Select type...</option>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Infrastructure *" error={errors.infraType}>
            <select className="select" style={{ width: "100%" }} value={form.infraType} onChange={e => set("infraType", e.target.value)}>
              {INFRA_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Severity + Substation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Severity">
            <select className="select" style={{ width: "100%" }} value={form.severity} onChange={e => set("severity", e.target.value)}>
              {SEVERITY_OPTS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Affected Substation">
            <select className="select" style={{ width: "100%" }} value={form.substation} onChange={e => set("substation", e.target.value)}>
              <option value="">Select (optional)...</option>
              {SUBSTATIONS.map(s => <option key={s.id} value={s.id}>{s.shortName}</option>)}
            </select>
          </Field>
        </div>

        {/* Location */}
        <Field label="Location / Address">
          <input
            className="input"
            placeholder="e.g. Peenya Industrial Area, Sector 2"
            value={form.location}
            onChange={e => set("location", e.target.value)}
          />
        </Field>

        {/* Description */}
        <Field label="Description *" error={errors.description}>
          <textarea
            className="input"
            rows={3}
            placeholder="Describe the incident in detail — what happened, when, visible symptoms..."
            value={form.description}
            onChange={e => set("description", e.target.value)}
            style={{ resize: "vertical", minHeight: 80 }}
          />
        </Field>

        {/* Reporter + Contact */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Reporter Name *" error={errors.reporter}>
            <input
              className="input"
              placeholder="Your name"
              value={form.reporter}
              onChange={e => set("reporter", e.target.value)}
            />
          </Field>
          <Field label="Contact (optional)">
            <input
              className="input"
              placeholder="Phone / email"
              value={form.contact}
              onChange={e => set("contact", e.target.value)}
            />
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Submitting...
              </>
            ) : (
              <><Send size={13} /> Submit Report</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
