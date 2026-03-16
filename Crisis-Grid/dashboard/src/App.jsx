/**
 * App.jsx — Root application component
 *
 * Owns all global state and wires together every page, hook, and data source.
 * Responsibilities:
 *  - Page routing (state-based, no router library)
 *  - Power grid substation polling (every 10s via mockData)
 *  - Smart city infra polling (every 15s for water/gas/comms, 30s for physical)
 *  - Auto-creating incidents from detected anomalies and simulated faults
 *  - Persisting sensor readings to DynamoDB via useDynamo
 *  - Emergency mode lifecycle (activate on critical fault, auto-clear after 30s)
 *  - Disaster mode toggle and scenario selection
 *  - Toast notification dispatch
 */
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/ToastContainer";
import DisasterModeButton from "./components/DisasterModeButton";
import DisasterModePanel from "./components/DisasterModePanel";
import { AppProvider, useToast } from "./context/AppContext";
import { SUBSTATIONS } from "./data/bangaloreData";
import { generateLiveReading, analyzeReading } from "./data/mockData";
import { faultTypeToSolution } from "./data/incidentSolutions";
import { WATER_ASSETS, GAS_ASSETS, COMMS_ASSETS, PHYSICAL_ASSETS } from "./data/smartCityData";
import { useInfraData } from "./hooks/useInfraData";
import { useDynamo } from "./hooks/useDynamo";
import { simulateMultiFault, faultToIncident } from "./data/simulateFault";

// ── Lazy-load all pages to reduce initial bundle size ─────────────────────────
const Dashboard           = lazy(() => import("./pages/Dashboard"));
const Monitoring          = lazy(() => import("./pages/Monitoring"));
const FailurePrediction   = lazy(() => import("./pages/FailurePrediction"));
const CascadeSimulation   = lazy(() => import("./pages/CascadeSimulation"));
const DecisionSupport     = lazy(() => import("./pages/DecisionSupport"));
const HistoricalAnalytics = lazy(() => import("./pages/HistoricalAnalytics"));
const Incidents           = lazy(() => import("./pages/Incidents"));
const SmartCity           = lazy(() => import("./pages/SmartCity"));
const WaterInfra          = lazy(() => import("./pages/WaterInfra"));
const GasInfra            = lazy(() => import("./pages/GasInfra"));
const CommsInfra          = lazy(() => import("./pages/CommsInfra"));
const PhysicalInfra       = lazy(() => import("./pages/PhysicalInfra"));

// ── Skeleton shown while a lazy page is loading ───────────────────────────────
function PageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 4 }}>
      <div className="skeleton" style={{ height: 40, width: "40%" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
      </div>
      <div className="skeleton" style={{ height: 360 }} />
    </div>
  );
}

// ── Inner app — wrapped by AppProvider so useToast is available ───────────────
function AppInner() {
  // ── Page routing ────────────────────────────────────────────────────────────
  const [page, setPage] = useState("dashboard");

  // ── Power grid state ─────────────────────────────────────────────────────────
  const [substationData, setSubstationData] = useState({});   // keyed by substation ID
  const [alerts, setAlerts] = useState([]);                   // active anomaly alerts (max 25)
  const [newAlertIds, setNewAlertIds] = useState(new Set());  // IDs with unread badge

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [rerouteAnimation, setRerouteAnimation] = useState({ active: false }); // map reroute overlay

  // ── Incident log ─────────────────────────────────────────────────────────────
  const [incidents, setIncidents] = useState([]);
  // incidentNav: { incidentId } — deep-link target set when a toast is clicked
  const [incidentNav, setIncidentNav] = useState(null);

  // ── Disaster mode ─────────────────────────────────────────────────────────────
  const [disasterMode, setDisasterMode] = useState(false);
  const [disasterPanelOpen, setDisasterPanelOpen] = useState(false);
  const [disasterEmergencyType, setDisasterEmergencyType] = useState("flood");
  const [disasterScenario, setDisasterScenario] = useState(null);

  // ── Simulated faults feed (shown on dashboard) ────────────────────────────────
  const [simulatedFaults, setSimulatedFaults] = useState([]);

  const { addToast } = useToast();

  // ── DynamoDB persistence hook ─────────────────────────────────────────────────
  const { writeReading } = useDynamo();

  // ── Smart city infra polling ──────────────────────────────────────────────────
  // Water, Gas, Comms: poll every 15 seconds
  const { readings: infraReadings15, activeEvents: activeEvents15 } = useInfraData(
    [...WATER_ASSETS, ...GAS_ASSETS, ...COMMS_ASSETS],
    15000,
  );

  // Physical/Civil assets: poll every 30 seconds (slower-changing data)
  const { readings: physicalReadings, activeEvents: activeEvents30 } = useInfraData(
    PHYSICAL_ASSETS,
    30000,
  );

  // Merge all infra readings into a single Map<assetId, SensorReading>
  const infraData = useMemo(() => {
    const merged = new Map(infraReadings15);
    physicalReadings.forEach((val, key) => merged.set(key, val));
    return merged;
  }, [infraReadings15, physicalReadings]);

  // Merge active threshold-breach events from both polling intervals
  const allActiveEvents = useMemo(
    () => [...activeEvents15, ...activeEvents30],
    [activeEvents15, activeEvents30],
  );

  // Persist every new sensor reading to DynamoDB via the Lambda endpoint
  useEffect(() => {
    infraData.forEach((reading) => {
      writeReading(reading);
    });
  // writeReading is stable — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infraData]);

  // ── Deep-link navigation to a specific incident ───────────────────────────────
  const navigateToIncident = useCallback((incidentId) => {
    setIncidentNav({ incidentId });
    setPage("incidents");
  }, []);

  // ── Convert a power grid anomaly result into an incident record ───────────────
  const alertToIncident = useCallback((result, sub) => {
    const { infra, type } = faultTypeToSolution(result.fault_type);
    return {
      id: `INC-${result.substation_id}-${Date.now()}`,
      title: `${type.replace(/_/g, " ")} — ${sub?.shortName || result.substation_id}`,
      type,
      infraType: infra,
      substation: result.substation_id,
      location: `${sub?.name || ""}, ${sub?.area || ""}`.trim().replace(/^,|,$/g, ""),
      severity: result.severity,
      description: `Automated alert: ${result.fault_type?.replace(/_/g, " ")} detected at ${sub?.shortName}. Failure probability: ${(result.failure_probability * 100).toFixed(0)}%.`,
      reporter: "System (Auto-detected)",
      contact: "BESCOM Control Room",
      timestamp: new Date().toISOString(),
      status: "open",
      isNew: true,
      // Raw sensor data kept for the incident detail page
      fault_type: result.fault_type,
      failure_probability: result.failure_probability,
      sensor_readings: result.sensor_readings,
      decision_support: result.decision_support,
    };
  }, []);

  /**
   * processSubstation — generates a live reading for one substation,
   * runs anomaly analysis, updates state, and auto-creates an incident
   * if an anomaly is detected.
   *
   * @param {string}  subId        - Substation ID (e.g. "SUB_PEENYA")
   * @param {boolean} forceAnomaly - If true, forces an anomaly reading (used by Simulate Fault)
   */
  const processSubstation = useCallback((subId, forceAnomaly = false) => {
    const reading = generateLiveReading(subId, forceAnomaly);
    const result  = analyzeReading(reading);
    const sub     = SUBSTATIONS.find(s => s.id === subId);

    // Update the live substation data map
    setSubstationData(prev => ({ ...prev, [subId]: result }));

    if (result.is_anomaly) {
      // Add to alert panel (deduplicated per substation, max 25 alerts)
      setAlerts(prev => [result, ...prev.filter(a => a.substation_id !== subId)].slice(0, 25));
      setNewAlertIds(prev => new Set([...prev, subId]));

      // Auto-create an incident — deduplicated within a 30-second window
      const incident = alertToIncident(result, sub);
      setIncidents(prev => {
        const recent = prev.find(
          i => i.substation === subId && Date.now() - new Date(i.timestamp).getTime() < 30000
        );
        if (recent) return prev; // skip duplicate
        return [incident, ...prev];
      });

      // Show a clickable toast only for manually injected faults
      if (forceAnomaly) {
        addToast(
          `⚡ Fault at ${sub?.shortName || subId} — ${result.fault_type?.replace(/_/g, " ")}`,
          "error",
          6000,
          () => navigateToIncident(incident.id),
        );
      }
    }

    // Activate emergency mode if the decision support engine flags it
    if (result.decision_support?.emergency_mode) {
      setEmergencyMode(true);
      addToast("Emergency mode activated — critical fault detected", "error", 6000);
    }

    return result;
  }, [addToast, alertToIncident, navigateToIncident]);

  // Initial poll — run once for all substations on mount
  useEffect(() => {
    SUBSTATIONS.forEach(s => processSubstation(s.id));
  }, [processSubstation]);

  // Background poll — one random substation every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const sub = SUBSTATIONS[Math.floor(Math.random() * SUBSTATIONS.length)];
      processSubstation(sub.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [processSubstation]);

  // Auto-clear emergency mode after 30 seconds
  useEffect(() => {
    if (emergencyMode) {
      const t = setTimeout(() => {
        setEmergencyMode(false);
        addToast("Emergency mode cleared", "success");
      }, 30000);
      return () => clearTimeout(t);
    }
  }, [emergencyMode, addToast]);

  /**
   * handleInjectFault — triggered by the "Simulate Fault" button.
   * Injects a forced power anomaly on a random substation AND generates
   * 1–2 random non-power faults via simulateMultiFault().
   */
  const handleInjectFault = () => {
    // Power fault: force an anomaly on a random substation
    const sub = SUBSTATIONS[Math.floor(Math.random() * SUBSTATIONS.length)];
    const result = processSubstation(sub.id, true);

    // Trigger map reroute animation if the decision support engine suggests one
    const sim = result.decision_support?.recovery_simulation;
    if (sim) {
      setRerouteAnimation({ active: true, faultedId: sub.id, rerouteTo: sim.reroute_to });
      setTimeout(() => setRerouteAnimation({ active: false }), 6000);
    }

    // Non-power faults: water, gas, comms, or physical
    const newFaults = simulateMultiFault();

    newFaults.forEach(fault => {
      // Convert each fault to an incident and add to the log
      const incident = faultToIncident(fault);
      setIncidents(prev => [incident, ...prev]);

      // Show a toast with an infra-specific emoji
      const icon = { water: "💧", gas: "🔥", communications: "📡", physical: "🏗" }[fault.infrastructureType] || "⚠";
      const sevColor = fault.severity === "critical" ? "error" : fault.severity === "high" ? "error" : "warning";
      addToast(
        `${icon} ${fault.severity.toUpperCase()} — ${fault.faultType.replace(/_/g, " ")} at ${fault.assetName}`,
        sevColor,
        6000,
      );
    });

    // Keep only the 20 most recent simulated faults in the feed
    setSimulatedFaults(prev => [...newFaults, ...prev].slice(0, 20));
  };

  // Remove an alert from the panel and clear its unread badge
  const handleDismissAlert = (subId) => {
    setAlerts(prev => prev.filter(a => a.substation_id !== subId));
    setNewAlertIds(prev => { const n = new Set(prev); n.delete(subId); return n; });
    addToast("Alert dismissed", "info", 2000);
  };

  /**
   * handleAlertNavigate — clicking an alert in the AlertPanel navigates
   * to the matching incident detail. Creates the incident on-the-fly if
   * it doesn't exist yet (e.g. for background-polled anomalies).
   */
  const handleAlertNavigate = (alert) => {
    const inc = incidents.find(i => i.substation === alert.substation_id);
    if (inc) {
      navigateToIncident(inc.id);
    } else {
      // Create incident on-the-fly and navigate immediately
      const sub = SUBSTATIONS.find(s => s.id === alert.substation_id);
      const incident = alertToIncident(alert, sub);
      setIncidents(prev => [incident, ...prev]);
      navigateToIncident(incident.id);
    }
    setNewAlertIds(prev => { const n = new Set(prev); n.delete(alert.substation_id); return n; });
  };

  // Kept for compatibility — incidents are now auto-created, not manually submitted
  const handleIncidentSubmit = (incident) => {
    setIncidents(prev => [incident, ...prev]);
  };

  // Partial update to an existing incident (e.g. status change from detail page)
  const handleIncidentUpdate = (id, updates) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  // Clear the deep-link target when navigating away from the incidents page
  const handlePageChange = (p) => {
    if (p !== "incidents") setIncidentNav(null);
    setPage(p);
  };

  // Toggle disaster mode and open/close the scenario panel
  const handleDisasterToggle = () => {
    const next = !disasterMode;
    setDisasterMode(next);
    setDisasterPanelOpen(next);
    addToast(
      next ? "⚠ Disaster Mode activated — map overlays enabled" : "Disaster Mode deactivated",
      next ? "error" : "info",
      4000,
    );
  };

  // Props shared across multiple pages
  const sharedProps = {
    substationData, alerts, emergencyMode, rerouteAnimation,
    disasterMode, disasterEmergencyType, disasterScenario,
  };

  // Page component map — keyed by the `page` state string
  const pages = {
    dashboard:  <Dashboard {...sharedProps} infraData={infraData} simulatedFaults={simulatedFaults} onInjectFault={handleInjectFault} onDismissAlert={handleDismissAlert} onAlertNavigate={handleAlertNavigate} newAlertIds={[...newAlertIds]} />,
    monitoring: <Monitoring substationData={substationData} />,
    prediction: <FailurePrediction substationData={substationData} infraData={infraData} activeEvents={allActiveEvents} />,
    cascade:    <CascadeSimulation substationData={substationData} />,
    decision:   <DecisionSupport substationData={substationData} emergencyMode={emergencyMode} activeEvents={allActiveEvents} />,
    history:    <HistoricalAnalytics />,
    incidents:  <Incidents incidents={incidents} onUpdate={handleIncidentUpdate} initialIncidentId={incidentNav?.incidentId} />,
    smartcity:  <SmartCity />,
    water:      <WaterInfra infraData={infraData} />,
    gas:        <GasInfra infraData={infraData} />,
    comms:      <CommsInfra infraData={infraData} />,
    physical:   <PhysicalInfra infraData={infraData} />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        active={page}
        onChange={handlePageChange}
        emergencyMode={emergencyMode}
        alertCount={alerts.filter(a => a.severity === "critical" || a.severity === "high").length}
      />
      <main style={{
        flex: 1, padding: 24, overflowY: "auto",
        // Subtle red tint on the background when emergency mode is active
        background: emergencyMode
          ? "linear-gradient(180deg, rgba(239,68,68,0.04) 0%, var(--bg) 120px)"
          : "var(--bg)",
        transition: "background 0.5s ease",
        minWidth: 0,
      }}>
        {/* Suspense boundary shows skeleton while lazy page loads */}
        <Suspense fallback={<PageSkeleton />}>
          {pages[page]}
        </Suspense>
      </main>
      <ToastContainer />
      {/* Floating disaster mode toggle button (bottom-right) */}
      <DisasterModeButton active={disasterMode} onClick={handleDisasterToggle} />
      <DisasterModePanel
        open={disasterPanelOpen}
        onClose={() => setDisasterPanelOpen(false)}
        onScenarioChange={setDisasterScenario}
      />
    </div>
  );
}

// ── Root export — wraps AppInner with the context provider ────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
