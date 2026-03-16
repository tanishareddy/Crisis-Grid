/**
 * StatCard.jsx — Animated metric card for the dashboard
 *
 * Features:
 *  - Animated number counter when the value changes
 *  - Flash background effect on update
 *  - Colored status dot (green / amber / red) with pulse when alerts are high
 *  - Corner radial glow when value > 0 (alert state)
 *  - Hover glow and lift effect
 *  - Bottom accent bar that appears on hover or alert
 *  - Optional trend indicator (TrendingUp / TrendingDown / Minus)
 */
import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({
  label,        // Card title (e.g. "Power Anomalies")
  value,        // Numeric value to display
  unit,         // Unit label shown after the number (e.g. "faults")
  color,        // Accent color — changes based on alert state
  icon: Icon,   // Lucide icon component
  sub,          // Subtitle / helper text below the value
  trend,        // Numeric trend percentage (positive = bad for alerts)
  onClick,      // Optional click handler — makes card interactive
  animDelay = 0 // CSS animation delay in seconds (staggers card entrance)
}) {
  const [hovered, setHovered] = useState(false);
  const [displayValue, setDisplayValue] = useState(value); // animated counter value
  const [flash, setFlash] = useState(false);               // triggers background flash
  const prevValue = useRef(value);                         // tracks previous value for diff
  const c = color || "var(--cyan)";

  // Card is in "alert" state whenever value is non-zero
  const isAlert = value > 0;

  // ── Animate number change ─────────────────────────────────────────────────
  useEffect(() => {
    if (prevValue.current !== value) {
      // Flash the card background briefly on any value change
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 600);

      // Animate the counter from old value to new value over ~12 steps
      const start = prevValue.current;
      const end = value;
      const diff = end - start;
      if (diff === 0) { setDisplayValue(value); return; }

      const steps = Math.min(Math.abs(diff), 12);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setDisplayValue(Math.round(start + (diff * step) / steps));
        if (step >= steps) {
          clearInterval(interval);
          setDisplayValue(end); // ensure we land exactly on the target
        }
      }, 30);

      prevValue.current = value;
      return () => { clearInterval(interval); clearTimeout(timeout); };
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  // ── Trend icon and color ──────────────────────────────────────────────────
  // For alert metrics: up = bad (red), down = good (green)
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "var(--red)" : trend < 0 ? "var(--green)" : "var(--text-muted)";

  // Status dot: green when clear, amber for low alerts, red for 5+ alerts
  const dotColor = isAlert
    ? (value >= 5 ? "var(--red)" : "var(--amber)")
    : "var(--green)";

  return (
    <div
      className={`card ${onClick ? "card-interactive" : ""} animate-slide-up`}
      style={{
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        minWidth: 140,
        position: "relative",
        overflow: "hidden",
        // Border brightens on hover or when in alert state
        borderColor: hovered ? `${c}55` : isAlert ? `${c}33` : "var(--border)",
        // Glow shadow on hover or alert
        boxShadow: hovered
          ? `0 0 28px ${c}22, 0 4px 24px rgba(0,0,0,0.4)`
          : isAlert
          ? `0 0 14px ${c}14`
          : "none",
        transition: "all 0.25s ease",
        animationDelay: `${animDelay}s`,
        cursor: onClick ? "pointer" : "default",
        // Flash background briefly when value updates
        background: flash
          ? `linear-gradient(135deg, var(--panel), ${c}0a)`
          : "var(--panel)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Corner radial glow — only visible when card is in alert state */}
      {isAlert && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 60, height: 60,
          background: `radial-gradient(circle at top right, ${c}18, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}

      {/* ── Label row: icon + title + status dot ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          color: "var(--text-muted)", fontSize: 11, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: 0.6,
        }}>
          {Icon && (
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: `${c}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={12} color={c} />
            </div>
          )}
          {label}
        </div>

        {/* Status dot — pulses when value >= 3 */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: dotColor,
          boxShadow: isAlert ? `0 0 6px ${dotColor}` : "none",
          animation: isAlert && value >= 3 ? "pulse-dot 2s infinite" : "none",
          flexShrink: 0,
        }} />
      </div>

      {/* ── Animated value display ── */}
      <div style={{
        fontSize: 30, fontWeight: 800, color: c, lineHeight: 1,
        letterSpacing: -0.5,
        // Brief bounce animation when value changes
        animation: flash ? "counter-up 0.3s ease" : "none",
      }}>
        {displayValue}
        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 5, color: "var(--text-muted)" }}>
          {unit}
        </span>
      </div>

      {/* ── Subtitle + trend row ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 2,
      }}>
        {sub && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
            {sub}
          </div>
        )}
        {trend !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, color: trendColor, fontSize: 11, flexShrink: 0 }}>
            <TrendIcon size={11} />
            {trend !== 0 && <span>{Math.abs(trend).toFixed(1)}%</span>}
          </div>
        )}
      </div>

      {/* ── Bottom accent bar — appears on hover or alert ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${c}99, transparent)`,
        borderRadius: "0 0 12px 12px",
        opacity: hovered || isAlert ? 1 : 0,
        transition: "opacity 0.25s",
      }} />
    </div>
  );
}
