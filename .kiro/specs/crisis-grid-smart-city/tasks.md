# Implementation Plan: Crisis Grid Smart City Extension

## Overview

Extend the existing BESCOM Power Monitoring Dashboard into a Multi-Infrastructure Smart City Platform by adding Water, Gas, Communications, and Physical infrastructure monitoring. All existing power functionality is preserved. New infrastructure shares a unified asset data model, map layer system, cross-infrastructure failure prediction, and enhanced AI Decision Support.

## Tasks

- [x] 1. Create smart city data modules (`smartCityData.js` and `smartCityMock.js`)
  - Define the base `Asset` interface and extended schemas for Water, Gas, Communications, and Physical assets
  - Seed a minimum of 3 assets per infrastructure type per zone (7 zones × 4 types = 84+ assets) in `smartCityData.js` using the ID pattern `{PREFIX}_{TYPE}_{ZONE}_{NN}`
  - Export zone constants, infrastructure type colours, and per-type fault/threshold definitions
  - Implement `generateWaterReading(assetId, forceAnomaly)`, `generateGasReading(assetId, forceAnomaly)`, `generateCommsReading(assetId, forceAnomaly)`, and `generatePhysicalReading(assetId, forceAnomaly)` in `smartCityMock.js`
  - Each generator must return realistic randomised values; `forceAnomaly=true` must breach the thresholds defined in Requirements 11.5–11.8
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

  - [ ]* 1.1 Write property tests for sensor generators
    - **Property 1: forceAnomaly always breaches threshold** — for all four generators, calling with `forceAnomaly=true` must always produce a reading that triggers the corresponding warning condition
    - **Property 2: Normal readings stay within bounds** — without `forceAnomaly`, generated values must remain within realistic operating ranges (e.g. water pressure 1.5–8 bar, gas leakPpm 0–20)
    - **Validates: Requirements 11.5, 11.6, 11.7, 11.8**

- [x] 2. Implement `useInfraData` hook
  - Create `Crisis-Grid/dashboard/src/hooks/useInfraData.js`
  - Accept `(assets: Asset[], intervalMs: number)` and return `{ readings: Map<assetId, SensorReading>, activeEvents: ActiveEvent[] }`
  - Run `setInterval` at `intervalMs`; on each tick call the correct generator from `smartCityMock.js` based on `asset.infraType`
  - Derive `activeEvents` by applying the Heuristic_Scorer thresholds from the design document after each tick
  - Each `ActiveEvent` must include `eventId`, `assetId`, `infraType`, `zone`, `severity`, `description`, `timestamp`, and `resolved: false`
  - _Requirements: 7.3, 7.4, 7.5, 7.6, 2.8, 3.8, 4.8, 5.8_

  - [ ]* 2.1 Write unit tests for `useInfraData` event derivation
    - Test that a reading breaching a threshold produces an `ActiveEvent` with the correct severity
    - Test that a reading returning to normal marks the event `resolved: true`
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [x] 3. Implement `useDynamo` hook
  - Create `Crisis-Grid/dashboard/src/hooks/useDynamo.js`
  - Export `{ writeReading, writeAsset, writePrediction, writeEvent }` — each calls `fetch(API_URL, { method: "POST", body: { action, payload } })`
  - On any fetch error, log to `console.error` and resolve without throwing (silent fail)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 3.1 Write unit tests for `useDynamo` error handling
    - Mock `fetch` to reject; assert the hook does not throw and logs the error
    - _Requirements: 9.5_

- [x] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extend `BangaloreMap.jsx` with multi-layer support
  - Add optional props: `layers?: Map<InfraType, Asset[]>`, `activeLayers?: Set<InfraType>`, `layerReadings?: Map<assetId, SensorReading>`
  - When `layers` is provided, render additional `CircleMarker` groups per active layer using the infrastructure-type colours from Requirement 1.5
  - Gate existing power rendering on `activeLayers.has("power")` defaulting to `true` when the prop is absent — all existing power behaviour must be unchanged
  - On hover, show a `Tooltip` with asset name, Zone, Infrastructure_Type, and current Risk_Level (Requirement 1.6)
  - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 12.3_

  - [ ]* 5.1 Write unit tests for layer rendering logic
    - Test that deactivating a layer removes its markers from the rendered output
    - Test that absent `layers` prop leaves power rendering intact
    - _Requirements: 1.3, 1.7_

- [x] 6. Implement `LayerToggle.jsx` component
  - Create `Crisis-Grid/dashboard/src/components/LayerToggle.jsx`
  - Render one toggle button per `InfraType`; call `onToggle(infraType)` on click
  - Position absolutely over the map at z-index 1000
  - Accept `compact?: boolean`; when `true` render icon-only row (Requirement 1.8)
  - _Requirements: 1.1, 1.4, 1.8_

- [x] 7. Implement `AssetList.jsx` component
  - Create `Crisis-Grid/dashboard/src/components/AssetList.jsx`
  - Props: `{ assets, readings, onSelect, selectedId, infraType }`
  - Render a scrollable table: asset name, zone, type, key metric, status badge
  - Highlight rows with warning/critical conditions using per-infrastructure thresholds (red for critical, amber for warning)
  - _Requirements: 2.4, 2.6, 2.7, 3.4, 3.6, 3.7, 4.4, 4.6, 4.7, 5.4, 5.6, 5.7_

- [x] 8. Implement `AssetDetailPanel.jsx` component
  - Create `Crisis-Grid/dashboard/src/components/AssetDetailPanel.jsx`
  - Props: `{ asset, reading, infraType, onClose }`
  - Use a field-config lookup table (keyed by `infraType`) to render sensor fields — avoid per-type JSX branching
  - Display all fields required by Requirements 2.5, 3.5, 4.5, 5.5 plus `lastUpdated` timestamp
  - _Requirements: 2.5, 3.5, 4.5, 5.5_

- [x] 9. Implement `WaterInfra.jsx` page
  - Create `Crisis-Grid/dashboard/src/pages/WaterInfra.jsx`
  - Props: `{ infraData: Map<assetId, SensorReading> }`
  - Top_Metrics row: pump stations online, active leaks detected, average network pressure (bar), average flow efficiency (%)
  - Embed `BangaloreMap` with Water layer active by default via `LayerToggle`
  - Render `AssetList` filtered to `infraType === "water"`; on select render `AssetDetailPanel`
  - Pressure < 1.5 bar → red indicator + increment leak count (Requirement 2.6); pump health < 40 → warning badge (Requirement 2.7)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 10. Implement `GasInfra.jsx` page
  - Create `Crisis-Grid/dashboard/src/pages/GasInfra.jsx`
  - Props: `{ infraData: Map<assetId, SensorReading> }`
  - Top_Metrics row: pipeline segments monitored, active pressure anomalies, average distribution pressure (bar), leak alerts count
  - Embed `BangaloreMap` with Gas layer active by default
  - Render `AssetList` filtered to `infraType === "gas"`; on select render `AssetDetailPanel`
  - leakPpm > 50 → critical badge + create `ActiveEvent` (Requirement 3.6); outlet pressure deviation > 20% → amber warning (Requirement 3.7)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 11. Implement `CommsInfra.jsx` page
  - Create `Crisis-Grid/dashboard/src/pages/CommsInfra.jsx`
  - Props: `{ infraData: Map<assetId, SensorReading> }`
  - Top_Metrics row: communication nodes online, nodes with degraded signal, average uptime (%), active outage count
  - Embed `BangaloreMap` with Communications layer active by default
  - Render `AssetList` filtered to `infraType === "comms"`; on select render `AssetDetailPanel`
  - uptimePct < 95 → amber warning (Requirement 4.6); backhaulStatus === "offline" → critical badge (Requirement 4.7)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 12. Implement `PhysicalInfra.jsx` page
  - Create `Crisis-Grid/dashboard/src/pages/PhysicalInfra.jsx`
  - Props: `{ infraData: Map<assetId, SensorReading> }`
  - Top_Metrics row: physical assets monitored, assets with structural warnings, average structural health score, critical alerts count
  - Embed `BangaloreMap` with Physical layer active by default
  - Render `AssetList` filtered to `infraType === "physical"`; on select render `AssetDetailPanel`
  - structuralHealthScore < 50 → amber warning (Requirement 5.6); < 25 → critical badge + create `ActiveEvent` (Requirement 5.7)
  - Polling interval must be 30 seconds (Requirement 5.8)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 13. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 14. Extend `Sidebar.jsx` with grouped Infrastructure navigation
  - Replace the flat `NAV` array with `NAV_GROUPS` supporting `type: "group"` entries with collapsible `items`
  - Add an "Infrastructure" group containing: Power (existing `monitoring`), Water, Gas, Communications, Physical
  - Group defaults to expanded; clicking the header toggles visibility (Requirements 6.2, 6.3)
  - Active sub-page is highlighted using the Infrastructure_Type colour (Requirement 6.4)
  - All existing top-level entries (Dashboard, Failure Prediction, Cascade Simulation, AI Decision Support, Historical Analytics, Incident Reports, Smart City) remain unchanged (Requirement 6.5)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.1_

- [x] 15. Implement Heuristic_Scorer and extend `FailurePrediction.jsx`
  - Implement `scoreAsset(asset, reading)` in a new `Crisis-Grid/dashboard/src/data/heuristicScorer.js` file using the exact formulas from the design document for Water, Gas, Comms, Physical, and Power
  - Risk_Level thresholds: Low < 0.35, Medium 0.35–0.69, High ≥ 0.70
  - For Power assets, derive score from `failure_probability` returned by the existing `analyzeReading` (Requirement 7.10)
  - Extend `FailurePrediction.jsx` to accept `infraData` prop and add an Infrastructure_Type filter control
  - When a filter is active, update the ranked asset list to show only matching assets with name, type, zone, risk score (%), and Risk_Level badge (Requirement 7.8)
  - Render `BangaloreMap` with all active layers visible, asset nodes coloured by Risk_Level (Requirement 7.7)
  - Existing power gauges and future risk predictions remain visible when Power filter is active (Requirement 7.9)
  - Write prediction results via `useDynamo.writePrediction` on each scorer run (Requirement 9.3)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 9.3_

  - [ ]* 15.1 Write property tests for `scoreAsset`
    - **Property 3: Score monotonicity for Water** — lower `pumpHealthScore` must produce a score ≥ higher `pumpHealthScore` score, all else equal
    - **Property 4: Score monotonicity for Gas** — higher `leakPpm` must produce a score ≥ lower `leakPpm` score
    - **Property 5: Risk_Level thresholds are exhaustive** — for any score in [0,1], `scoreAsset` must return exactly one of Low/Medium/High
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6**

  - [ ]* 15.2 Write unit tests for Power score passthrough
    - Assert that `scoreAsset` for a Power asset returns the same value as `failure_probability` from `analyzeReading`
    - **Validates: Requirement 7.10**

- [x] 16. Extend `DecisionSupport.jsx` for cross-infrastructure events
  - Add an Active_Events Panel listing all `ActiveEvent` objects across all infrastructure types, sorted by severity descending (Requirement 8.1)
  - On event selection, display an AI Analysis Panel: call `useBedrock.analyze` with `infraType`, asset metadata, and current sensor readings as structured context (Requirement 8.8)
  - Display Impact_Overview: estimated population affected, impacted zones, impacted infrastructure types (Requirement 8.4)
  - Display AI_Action_Plan: prioritised action list from Bedrock response (Requirement 8.5)
  - When Bedrock is unavailable, show a locally-generated fallback plan based on `infraType` and severity (Requirement 8.6)
  - Preserve all existing Power-specific rerouting simulation, BESCOM protocol actions, and citizen notification features for Power events (Requirement 8.7)
  - Remove resolved events (severity back to "low") from the Active_Events Panel (Requirement 8.9)
  - Write new `ActiveEvent` records via `useDynamo.writeEvent` (Requirement 9.4)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.4_

- [x] 17. Wire new pages and hooks into `App.jsx`
  - Import and lazy-load `WaterInfra`, `GasInfra`, `CommsInfra`, `PhysicalInfra`
  - Instantiate `useInfraData` with all non-power assets from `smartCityData.js` at 15-second interval (30 seconds for physical assets)
  - Instantiate `useDynamo` and pass `writeReading` into `useInfraData` to persist each reading (Requirement 9.1)
  - Add page keys `water`, `gas`, `comms`, `physical` to the `pages` map and pass `infraData` as props
  - Pass `activeEvents` from `useInfraData` down to `DecisionSupport` and `FailurePrediction`
  - Preserve the existing 10-second Power substation polling loop without modification (Requirement 12.5)
  - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 9.1, 12.1, 12.5_

- [x] 18. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All existing files (`bangaloreData.js`, `mockData.js`, `cascadeEngine.js`, `incidentSolutions.js`, `useBedrock.js`, `AppContext.jsx`, `index.css`) must not be modified
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- The implementation language is JavaScript/JSX (React + Vite), matching the existing codebase
