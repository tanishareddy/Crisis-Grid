import { useMemo, useState } from "react";
import RiskGauge from "../components/RiskGauge";
import BangaloreMap from "../components/BangaloreMap";
import { SUBSTATIONS, FUTURE_RISK_ZONES } from "../data/bangaloreData";
import { ALL_SMART_CITY_ASSETS, WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS, INFRA_COLORS } from "../data/smartCityData";
import { scoreAsset } from "../data/heuristicScorer";
import { useDynamo } from "../hooks/useDynamo";
import { Clock, TrendingUp, Zap } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { id: "all",            label: "All" },
  { id: "power",          label: "Power" },
  { id: "water",          label: "Water" },
  { id: "gas",            label: "Gas" },
  { id: "communications", label: "Communications" },
  { id: "physical",       label: "Physical" },
];

const RISK_COLORS = {
  Low:    "#39FF14",
  Medium: "#FFB020",
  High:   "#FF3B3B",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const color = RISK_COLORS[level] || "#888";
  return (
    <span style={{
      background: `${color}22`,
      color,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 700,
      border: `1px solid ${color}55`,
    }}>
      {level?.toUpperCase()}
    </span>
  );
}

// Build the layers Map expected by BangaloreMap
function buildLayersMap(filterType) {
  const map = new Map();
  if (filterType === "all" || filterType === "water")          map.set("water",          WATER_ASSETS);
  if (filterType === "all" || filterType === "gas")            map.set("gas",            GAS_ASSETS);
  if (filterType === "all" || filterType === "communications") map.set("communications", COMMS_ASSETS);
  if (filterType === "all" || filterType === "physical")       map.set("physical",       PHYSICAL_ASSETS);
  return map;
}

// Build activeLayers Set for BangaloreMap
function buildActiveLayers(filterType) {
  if (filterType === "all") {
    return new Set(["power", "water", "gas", "communications", "physical"]);
  }
  return new Set([filterType]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FailurePrediction({ substationData, infraData = new Map(), activeEvents = [] }) {
  const [filterType, setFilterType] = useState("all");
  const { writePrediction } = useDynamo();

  // ── Power substation data (existing behaviour) ──────────────────────────────
  const sortedPower = SUBSTATIONS.map(s => ({
    ...s,
    data: substationData?.[s.id],
    prob: substationData?.[s.id]?.failure_probability || 0,
  })).sort((a, b) => b.prob - a.prob);

  // ── Non-power ranked asset list ─────────────────────────────────────────────
  const rankedAssets = useMemo(() => {
    // Determine which non-power assets to score
    let assets = [];
    if (filterType === "all") {
      assets = ALL_SMART_CITY_ASSETS;
    } else if (filterType === "water") {
      assets = WATER_ASSETS;
    } else if (filterType === "gas") {
      assets = GAS_ASSETS;
    } else if (filterType === "communications") {
      assets = COMMS_ASSETS;
    } else if (filterType === "physical") {
      assets = PHYSICAL_ASSETS;
    }

    const scored = assets.map(asset => {
      const reading = infraData.get(asset.assetId) || null;
      const { score, riskLevel } = scoreAsset(asset, reading);

      // Req 9.3 — write prediction to DynamoDB on each scorer run
      writePrediction({
        assetId:   asset.assetId,
        infraType: asset.infraType,
        zone:      asset.zone,
        score,
        riskLevel,
        timestamp: new Date().toISOString(),
      });

      return { asset, reading, score, riskLevel };
    });

    return scored.sort((a, b) => b.score - a.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, infraData]);

  // ── Map props ───────────────────────────────────────────────────────────────
  const layers       = buildLayersMap(filterType);
  const activeLayers = buildActiveLayers(filterType);

  // Build a layerReadings map that colours nodes by Risk_Level
  // We pass a synthetic reading with status derived from riskLevel so BangaloreMap
  // can colour nodes. BangaloreMap uses reading.status → getRiskLevelFromReading.
  const layerReadings = useMemo(() => {
    const map = new Map();
    rankedAssets.forEach(({ asset, riskLevel }) => {
      const status = riskLevel === "High" ? "critical" : riskLevel === "Medium" ? "warning" : "online";
      map.set(asset.assetId, { status });
    });
    return map;
  }, [rankedAssets]);

  const showPower = filterType === "all" || filterType === "power";

  return (
    <div className="animate-fade">
      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={18} color="var(--cyan)" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Failure Prediction</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Cross-infrastructure risk assessment — Bangalore Smart City
        </p>
      </div>

      {/* ── Infrastructure_Type filter (Req 7.1) ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {FILTER_OPTIONS.map(opt => {
          const active = filterType === opt.id;
          const color  = opt.id === "all" ? "var(--cyan)" : INFRA_COLORS[opt.id] || "var(--cyan)";
          return (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: `1px solid ${active ? color : "var(--border)"}`,
                background: active ? `${color}22` : "var(--panel)",
                color: active ? color : "var(--text-muted)",
                fontWeight: active ? 700 : 400,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── BangaloreMap with all active layers (Req 7.7) ── */}
      <div style={{ marginBottom: 24 }}>
        <BangaloreMap
          substationData={substationData}
          layers={layers}
          activeLayers={activeLayers}
          layerReadings={layerReadings}
        />
      </div>

      {/* ── Power gauges — visible when Power filter active (Req 7.9) ── */}
      {showPower && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
            {sortedPower.map(s => (
              <RiskGauge key={s.id} probability={s.prob} label="Failure Risk" zone={s.shortName} />
            ))}
          </div>

          {/* Power ranking table */}
          <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <TrendingUp size={15} color="var(--blue)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Power Substation Risk Ranking</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {["Rank","Substation","Area","kV","Fault Type","Risk %","Severity","Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPower.map((s, i) => {
                    const color = s.prob > 0.75 ? "var(--red)" : s.prob > 0.45 ? "var(--amber)" : "var(--green)";
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid var(--border)22" }}>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>#{i + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>⚡ {s.shortName}</td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 11 }}>{s.area}</td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{s.voltage_kv}kV</td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{s.data?.fault_type?.replace(/_/g, " ") || "—"}</td>
                        <td style={{ padding: "8px 10px", color, fontWeight: 700 }}>{(s.prob * 100).toFixed(1)}%</td>
                        <td style={{ padding: "8px 10px", color }}>{s.data?.severity?.toUpperCase() || "—"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ background: `${color}22`, color, borderRadius: 4, padding: "2px 8px", fontSize: 10 }}>
                            {s.data?.is_anomaly ? "ANOMALY" : "NORMAL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Future risk predictions — power only (Req 7.9) */}
          <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Clock size={15} color="var(--amber)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Predicted Future Risk — BESCOM Network</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FUTURE_RISK_ZONES.map(r => {
                const sub = SUBSTATIONS.find(s => s.id === r.zone);
                const color = r.risk > 0.7 ? "var(--red)" : r.risk > 0.5 ? "var(--amber)" : "var(--green)";
                return (
                  <div key={r.zone} style={{ background: `${color}0D`, border: `1px solid ${color}33`, borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>⚡ {sub?.shortName}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{sub?.area} · {sub?.voltage_kv}kV</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color, fontWeight: 700, fontSize: 16 }}>{(r.risk * 100).toFixed(0)}%</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>ETA: {r.eta}</div>
                      </div>
                    </div>
                    <div style={{ background: "var(--bg)", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ width: `${r.risk * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.reason}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Non-power ranked asset list (Req 7.2, 7.3, 7.8) ── */}
      {filterType !== "power" && (
        <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <TrendingUp size={15} color="var(--cyan)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {filterType === "all" ? "All Infrastructure" : FILTER_OPTIONS.find(f => f.id === filterType)?.label} — Asset Risk Ranking
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>
              ({rankedAssets.length} assets)
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  {["Rank", "Asset Name", "Type", "Zone", "Risk %", "Risk Level"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankedAssets.map(({ asset, score, riskLevel }, i) => {
                  const color = RISK_COLORS[riskLevel] || "#888";
                  const infraColor = INFRA_COLORS[asset.infraType] || "#888";
                  return (
                    <tr key={asset.assetId} style={{ borderBottom: "1px solid var(--border)22" }}>
                      <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>#{i + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{asset.name}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: `${infraColor}22`, color: infraColor, borderRadius: 4, padding: "2px 8px", fontSize: 10 }}>
                          {asset.infraType.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 11 }}>{asset.zone}</td>
                      <td style={{ padding: "8px 10px", color, fontWeight: 700 }}>{(score * 100).toFixed(1)}%</td>
                      <td style={{ padding: "8px 10px" }}>
                        <RiskBadge level={riskLevel} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
