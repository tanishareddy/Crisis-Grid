/**
 * DisasterModeButton — fixed red button on the right side of the screen
 */
import { AlertTriangle } from "lucide-react";

export default function DisasterModeButton({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Disaster Mode"
      style={{
        position: "fixed",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 1050,
        background: active ? "#FF3B3B" : "rgba(255,59,59,0.85)",
        color: "#fff",
        border: "none",
        borderRadius: "8px 0 0 8px",
        padding: "14px 10px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        boxShadow: active
          ? "0 0 24px rgba(255,59,59,0.8), -4px 0 16px rgba(255,59,59,0.4)"
          : "-4px 0 16px rgba(255,59,59,0.3)",
        animation: active ? "pulse-red 1.5s infinite" : "none",
        transition: "background 0.2s, box-shadow 0.2s",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        minHeight: 120,
        backdropFilter: "blur(4px)",
      }}
    >
      <AlertTriangle size={18} color="#fff" style={{ transform: "rotate(90deg)" }} />
      <span style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: "#fff",
      }}>
        Disaster Mode
      </span>
    </button>
  );
}
