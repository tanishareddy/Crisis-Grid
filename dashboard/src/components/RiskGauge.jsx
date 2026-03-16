export default function RiskGauge({ probability = 0, label = "Failure Risk", zone }) {
  const pct = Math.min(Math.max(probability, 0), 1);
  const angle = -135 + pct * 270; // -135 to +135 degrees
  const color = pct > 0.75 ? "var(--red)" : pct > 0.45 ? "var(--amber)" : "var(--green)";
  const level = pct > 0.75 ? "CRITICAL" : pct > 0.45 ? "WARNING" : "NORMAL";

  // SVG arc path helper
  const polarToCartesian = (cx, cy, r, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (cx, cy, r, startDeg, endDeg) => {
    const s = polarToCartesian(cx, cy, r, startDeg);
    const e = polarToCartesian(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const cx = 80, cy = 80, r = 60;
  const needleTip = polarToCartesian(cx, cy, r - 8, angle);

  return (
    <div style={{
      background: "var(--panel)",
      borderRadius: 12,
      border: `1px solid ${color}33`,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
    }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      {zone && <div style={{ fontSize: 11, color: "var(--blue)" }}>{zone}</div>}

      <svg width={160} height={100} viewBox="0 0 160 100">
        {/* background arc */}
        <path d={arcPath(cx, cy, r, -135, 135)} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        {/* colored fill arc */}
        <path d={arcPath(cx, cy, r, -135, -135 + pct * 270)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        {/* tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const a = -135 + t * 270;
          const inner = polarToCartesian(cx, cy, r - 16, a);
          const outer = polarToCartesian(cx, cy, r - 8, a);
          return <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--text-muted)" strokeWidth="1.5" />;
        })}
        {/* needle */}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        {/* percentage text */}
        <text x={cx} y={cy + 22} textAnchor="middle" fill={color} fontSize="16" fontWeight="700">
          {(pct * 100).toFixed(0)}%
        </text>
      </svg>

      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: 1 }}>{level}</div>
    </div>
  );
}
