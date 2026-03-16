import { CheckCircle, AlertTriangle, XCircle, Info, X, ExternalLink } from "lucide-react";
import { useToast } from "../context/AppContext";

const ICONS  = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
const COLORS = { success: "var(--green)", error: "var(--red)", warning: "var(--amber)", info: "var(--blue)" };

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon  = ICONS[t.type]  || Info;
        const color = COLORS[t.type] || "var(--blue)";
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{ cursor: t.onClick ? "pointer" : "default" }}
            onClick={() => { t.onClick?.(); removeToast(t.id); }}
          >
            <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: "var(--text)" }}>{t.message}</span>
              {t.onClick && (
                <div style={{ fontSize: 11, color, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                  <ExternalLink size={10} /> View details
                </div>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); removeToast(t.id); }}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
