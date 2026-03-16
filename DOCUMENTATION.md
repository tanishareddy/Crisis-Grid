# Crisis Grid — Technical Documentation

## Overview

Crisis Grid is a real-time smart-city infrastructure monitoring and crisis management dashboard built for Bangalore, India. It monitors five infrastructure domains — Power, Water, Gas/LPG, Communications, and Physical/Civil — and provides AI-assisted fault analysis, incident tracking, failure prediction, and disaster mode overlays.

The system is designed around BESCOM (Bangalore Electricity Supply Company) substations and extends to cover the full smart-city asset landscape across Bangalore's zones.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework and build tool |
| Recharts | All charts and data visualizations |
| Leaflet / React-Leaflet | Interactive Bangalore infrastructure map |
| Lucide React | Icon library |
| CSS Variables | Dark theme design system |

### Backend / Cloud
| Technology | Purpose |
|---|---|
| AWS Lambda (Python 3.12) | Serverless API handler |
| Amazon Bedrock (Claude 3 Haiku) | AI fault analysis |
| Amazon DynamoDB | Fault log and sensor reading persistence |
| Amazon SNS | Critical alert notifications |
| Amazon S3 | Raw data and trained model storage |
| API Gateway (HTTP API) | REST endpoint exposed to frontend |

### ML / Data
| Technology | Purpose |
|---|---|
| scikit-learn | Isolation Forest (anomaly detection), Random Forest (failure prediction) |
| XGBoost | Fault type classification |
| pandas / numpy | Data preprocessing and feature engineering |
| joblib | Model serialization |

---

## Project Structure

```
Crisis-Grid/
├── dashboard/               # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # Root component, routing, global state
│   │   ├── main.jsx         # React entry point
│   │   ├── index.css        # Global CSS variables and animations
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Full-page views
│   │   ├── hooks/           # Custom React hooks
│   │   ├── data/            # Data generators, simulators, static data
│   │   └── context/         # React context (AppContext, toasts)
│   ├── public/              # Static assets
│   ├── package.json
│   └── vite.config.js
├── lambda/
│   ├── bedrock_handler.py   # Main Lambda — Bedrock AI + DynamoDB + SNS
│   └── inference.py         # ML inference Lambda — loads models from S3
├── models/
│   └── train_models.py      # ML model training script
├── pipeline/
│   └── preprocess.py        # Data preprocessing and S3 upload pipeline
├── data/
│   └── raw/
│       └── power_grid_bangalore.csv   # Training dataset
├── deploy/
│   ├── setup_aws.py         # One-shot AWS infrastructure provisioning
│   ├── aws_config.json      # Generated config (API URL, SNS ARN)
│   └── lambda_package.zip   # Packaged Lambda deployment artifact
└── requirements.txt         # Python dependencies
```

---

## Frontend Architecture

### App.jsx — Root Component

`App.jsx` is the application shell. It owns all global state and wires together every page and component.

**State managed at root level:**
- `substationData` — live sensor readings per substation (keyed by substation ID)
- `alerts` — active power grid anomalies (max 25)
- `incidents` — all auto-generated incidents across all infrastructure types
- `simulatedFaults` — faults injected via the Simulate Fault button
- `emergencyMode` — boolean, triggers emergency banner and red theme
- `disasterMode` / `disasterScenario` — disaster overlay state
- `incidentNav` — deep-link target for navigating to a specific incident

**Polling loops:**
- Every 10 seconds: a random substation is polled via `processSubstation()`
- Every 15 seconds: Water, Gas, and Comms assets are polled via `useInfraData`
- Every 30 seconds: Physical/Civil assets are polled via `useInfraData`

**Fault injection (`handleInjectFault`):**
1. Triggers a forced power anomaly on a random substation
2. Calls `simulateMultiFault()` to generate 1–2 non-power faults
3. Auto-creates incidents for all faults
4. Fires toast notifications

**Routing:** Page navigation is state-based (`page` string). All pages are lazy-loaded via `React.lazy` with a skeleton fallback.

---

## Pages

### Dashboard (`pages/Dashboard.jsx`)
The main command center view. Shows:
- Status bar with live indicator, uptime counter (HH:MM:SS), system status pill (NOMINAL / EMERGENCY)
- Smart City Overview panel: total assets, active faults, system risk score, critical systems
- Six StatCards: Power Anomalies, Water Alerts, Gas Alerts, Comms Offline, Structural Alerts, Open Incidents
- Simulated Fault Feed (live scrolling list of injected faults)
- Bangalore infrastructure map (Leaflet) with layer toggles
- Risk Gauge (highest substation failure probability)
- Alert Panel (latest power grid anomalies)

### Incidents (`pages/Incidents.jsx`)
Automatic incident history log. All incidents are system-generated — no manual reporting.
- Filters: infrastructure type, severity, status
- Sort: newest, oldest, severity, risk score
- Incident cards: severity accent bar, infra icon, severity badge, status pill, location, risk score progress bar

### Historical Analytics (`pages/HistoricalAnalytics.jsx`)
Infrastructure toggle (Power / Water / Gas / Communications / Civil) at the top. Each tab shows:
- Fault frequency over time (line chart)
- Severity distribution (bar chart)
- Average repair time (bar chart)
- Risk trend (area chart)

Bottom section: **AI Failure Pattern Analyzer** — shows summary stat cards, ranked failure list with occurrence counts, horizontal bar chart of top problem assets, possible causes, and recommendations. Data and accent color are keyed per infrastructure type.

### Monitoring (`pages/Monitoring.jsx`)
Live substation sensor readings table with health scores and anomaly flags.

### Failure Prediction (`pages/FailurePrediction.jsx`)
ML-based failure probability scores per substation and infrastructure asset.

### Decision Support (`pages/DecisionSupport.jsx`)
AI-generated action plans for active faults. Calls `useBedrock` hook to fetch Claude analysis.

### Infrastructure Pages
Each infrastructure type has a dedicated page:
- `WaterInfra.jsx` — water network assets, pressure, pump health
- `GasInfra.jsx` — gas pipeline assets, leak detection, pressure
- `CommsInfra.jsx` — cell towers, backhaul status, signal strength
- `PhysicalInfra.jsx` — bridges and civil structures, structural health scores

### SmartCity (`pages/SmartCity.jsx`)
Aggregated smart city overview across all non-power infrastructure.

---

## Components

| Component | Purpose |
|---|---|
| `Sidebar.jsx` | Left navigation with active page highlight and alert badge |
| `StatCard.jsx` | Animated metric card with number counter, status dot, accent bar, alert glow |
| `BangaloreMap.jsx` | Leaflet map with substation markers, infra layer toggles, disaster overlays |
| `AlertPanel.jsx` | Scrollable list of active power grid alerts with dismiss and navigate actions |
| `RiskGauge.jsx` | Radial gauge showing highest failure probability |
| `InfraSummaryBar.jsx` | Compact summary bar below the map |
| `DisasterModeButton.jsx` | Floating button to toggle disaster mode |
| `DisasterModePanel.jsx` | Slide-in panel for selecting disaster scenario type |
| `DisasterModeOverlay.jsx` | Map overlay for disaster scenarios |
| `ErrorBoundary.jsx` | React error boundary wrapper |
| `ToastContainer.jsx` | Toast notification stack |
| `Modal.jsx` | Generic modal wrapper |

---

## Hooks

### `useBedrock.js`
Calls the Lambda/API Gateway endpoint for Claude 3 Haiku AI analysis of power faults.

- Reads `VITE_API_URL` from environment
- If not configured, uses a local rule-based fallback with pre-written templates per fault type
- Returns: `{ analyze, loading, result, error, clear }`
- `analyze(substationData)` — sends substation ID, fault type, sensor readings, severity, failure probability

### `useDynamo.js`
Thin wrapper for writing records to DynamoDB via the Lambda endpoint.

- Methods: `writeReading`, `writeAsset`, `writePrediction`, `writeEvent`
- Falls back silently (logs to console) if `VITE_API_URL` is not set
- Called from `App.jsx` on every `infraData` update to persist sensor readings

### `useInfraData.js`
Polls sensor data generators for a list of assets at a configurable interval.

- Dispatches to the correct generator based on `asset.infraType`
- Derives `ActiveEvent[]` from threshold checks on each reading
- Returns: `{ readings: Map<assetId, SensorReading>, activeEvents: ActiveEvent[] }`

---

## Data Layer

### `bangaloreData.js`
Static definitions for all 12 BESCOM substations with coordinates, voltage levels, capacity (MVA), and area names.

### `smartCityData.js`
Static asset definitions for Water, Gas, Communications, and Physical infrastructure assets across Bangalore zones.

### `smartCityMock.js`
Sensor reading generators for each infrastructure type:
- `generateWaterReading(assetId)` — pressure, pump health, tank level, flow rate
- `generateGasReading(assetId)` — outlet pressure, leak ppm, valve status
- `generateCommsReading(assetId)` — signal strength, uptime %, backhaul status, active connections
- `generatePhysicalReading(assetId)` — structural health score, load %, vibration, last inspection date

### `mockData.js`
Power grid sensor reading generator and anomaly analyzer for substations.
- `generateLiveReading(substationId, forceAnomaly)` — produces voltage, current, frequency, temperature, load, power factor
- `analyzeReading(reading)` — applies thresholds and returns `is_anomaly`, `fault_type`, `failure_probability`, `severity`, `decision_support`

### `simulateFault.js`
Multi-infrastructure fault simulator.
- `simulateMultiFault()` — generates 1–2 random faults across Water, Gas, Communications, or Physical
- `faultToIncident(fault)` — converts a fault object into an incident record
- Fault templates per infra type with realistic descriptions

### `incidentSolutions.js`
Maps fault types to infrastructure category and human-readable type labels.

### `cascadeEngine.js`
Cascade failure simulation logic for power grid substations.

### `heuristicScorer.js`
Rule-based risk scoring for infrastructure assets.

### `disasterData.js`
Scenario definitions for disaster mode overlays (flood, earthquake, fire, etc.).

---

## Backend Architecture

### Lambda: `bedrock_handler.py`

The primary Lambda function. Handles all AI analysis requests from the frontend.

**Flow:**
1. Receives POST request from API Gateway with substation ID, fault type, sensor readings, severity, failure probability
2. If fault is normal or probability < 35%, returns a "nominal" response immediately (no Bedrock call)
3. Fetches recent fault history for the substation from DynamoDB
4. Builds a structured prompt for Claude 3 Haiku including substation context, sensor readings, reroute paths, and cascade risk map
5. Calls Bedrock `invoke_model` and parses the JSON response
6. Logs the fault and AI analysis to DynamoDB (`crisis-grid-faults` table)
7. If severity is `high` or `critical`, publishes a citizen alert to SNS
8. Returns the full analysis to the frontend

**Bedrock prompt output schema:**
```json
{
  "analysis": "technical analysis string",
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "cascade_risk": "assessment string",
  "estimated_restoration": "time estimate",
  "citizen_message": "public notification string",
  "confidence": "high | medium | low"
}
```

**Substation context:** 12 BESCOM substations with voltage level, capacity, area, reroute paths, and cascade risk mappings are hardcoded in the handler.

### Lambda: `inference.py`

ML inference Lambda. Loads trained models from S3 and runs predictions.

**Flow:**
1. Receives sensor feature vector (7 features)
2. Loads `anomaly_detector.pkl`, `fault_classifier.pkl`, `failure_predictor.pkl` from S3 (cached across warm invocations)
3. Runs Isolation Forest for anomaly detection
4. Runs XGBoost for fault type classification
5. Runs Random Forest for failure probability
6. Applies rule-based decision support engine
7. Returns full prediction payload including `is_anomaly`, `fault_type`, `failure_probability`, `severity`, `decision_support`

---

## ML Pipeline

### Data Preprocessing (`pipeline/preprocess.py`)

Merges three datasets into a unified power grid training dataset:
1. Smart energy meters (voltage, current, power factor, consumption)
2. IoT smart grid (frequency, active/reactive power, fault labels)
3. Asset monitoring (transformer temperature, load %, oil level, vibration, health score)

If real CSVs are not present in `data/raw/`, synthetic data is generated automatically with realistic fault injection (10% fault rate).

Output: `data/raw/power_grid_bangalore.csv` — uploaded to S3.

### Model Training (`models/train_models.py`)

Trains three models on the preprocessed dataset:

**Anomaly Detector (Isolation Forest)**
- Unsupervised — no labels needed
- `contamination=0.1` (10% expected anomaly rate)
- Features scaled with `StandardScaler`
- Saved as `anomaly_detector.pkl` (includes scaler)

**Fault Classifier (XGBoost)**
- Classifies fault type: normal, overload, line_fault, short_circuit, transformer_overheat, frequency_deviation, voltage_sag, earth_fault
- 80/20 train/test split
- Saved as `fault_classifier.pkl` (includes LabelEncoder)

**Failure Predictor (Random Forest)**
- Binary classification: will fail / won't fail
- `class_weight="balanced"` to handle imbalanced fault data
- Saved as `failure_predictor.pkl`

All three models are uploaded to S3 at `s3://crisis-grid-data/models/`.

**Input features (all three models):**
```
voltage_v, current_a, frequency_hz, active_power_kw,
transformer_temp_c, load_percent, power_factor
```

---

## Data Flow

```
Sensor Generators (frontend)
        │
        ▼
useInfraData / mockData (polling every 10–30s)
        │
        ▼
App.jsx (processSubstation / infraData Map)
        │
        ├──► useDynamo.writeReading() ──► API Gateway ──► Lambda ──► DynamoDB
        │
        ├──► Anomaly detected?
        │         │
        │         ▼
        │    Auto-create Incident ──► incidents[] state
        │         │
        │         ▼
        │    Toast notification
        │
        └──► Decision Support page
                  │
                  ▼
             useBedrock.analyze()
                  │
                  ▼
             API Gateway ──► bedrock_handler.py
                  │
                  ├──► DynamoDB (fault history lookup)
                  ├──► Bedrock Claude 3 Haiku (AI analysis)
                  ├──► DynamoDB (log fault + analysis)
                  └──► SNS (critical alert → citizen notification)
```

---

## Frontend–Backend Connection

The frontend connects to the backend via a single environment variable:

```
VITE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
```

This is written automatically to `dashboard/.env` by `deploy/setup_aws.py` after provisioning.

Both `useBedrock.js` and `useDynamo.js` read `import.meta.env.VITE_API_URL`. If the variable is not set, both hooks fall back gracefully — `useBedrock` uses local rule-based templates, `useDynamo` logs a warning and skips writes.

---

## Data Models

### Incident Object
```js
{
  id: "INC-SUB_PEENYA-1710000000000",
  title: "Transformer Overheat — Peenya",
  type: "transformer_overheat",
  infraType: "power",           // power | water | gas | communications | physical
  substation: "SUB_PEENYA",
  location: "Peenya, West Bangalore",
  severity: "high",             // low | medium | high | critical
  description: "...",
  reporter: "System (Auto-detected)",
  contact: "BESCOM Control Room",
  timestamp: "2026-03-15T10:30:00.000Z",
  status: "open",               // open | resolved
  isNew: true,
  fault_type: "transformer_overheat",
  failure_probability: 0.72,
  sensor_readings: { voltage_v, current_a, ... },
  decision_support: { actions, emergency_mode, ... }
}
```

### Fault Object (simulateFault.js)
```js
{
  id: "FAULT-WATER-1710000000000-4231",
  infrastructureType: "water",
  assetId: "WTR-001",
  assetName: "Yelahanka Water Treatment Plant",
  location: "North Bangalore",
  faultType: "water_leak",
  severity: "high",
  description: "Active water leak detected at ...",
  timestamp: "2026-03-15T10:30:00.000Z",
  riskScore: 70,
  status: "open",
  isNew: true
}
```

### Sensor Reading (Power)
```js
{
  substation_id: "SUB_PEENYA",
  voltage_v: 218.4,
  current_a: 52.1,
  frequency_hz: 49.8,
  active_power_kw: 11340,
  transformer_temp_c: 71.2,
  load_percent: 84.3,
  power_factor: 0.91,
  health_score: 67,
  is_anomaly: true,
  fault_type: "overload",
  failure_probability: 0.68,
  severity: "high"
}
```

### DynamoDB Fault Record
```
PK: substation_id (String)
SK: fault_id (String) — format: SUB_PEENYA_20260315103000
Fields: timestamp, fault_type, severity, failure_prob, ai_analysis,
        actions (JSON string), citizen_message, ttl (30-day expiry)
```

---

## AWS Infrastructure

All resources are provisioned in `us-east-1` by `deploy/setup_aws.py`.

| Resource | Name | Purpose |
|---|---|---|
| S3 Bucket | `crisis-grid-data` | Raw data and trained ML models |
| DynamoDB Table | `crisis-grid-faults` | Fault log with 30-day TTL |
| SNS Topic | `crisis-grid-alerts` | Critical alert notifications |
| Lambda Function | `crisis-grid-bedrock` | AI analysis handler |
| API Gateway | `crisis-grid-api` | HTTP API, POST /analyze |
| IAM Role | `crisis-grid-lambda-role` | Lambda execution role |

**IAM policies attached to Lambda role:**
- `AWSLambdaBasicExecutionRole`
- `AmazonDynamoDBFullAccess`
- `AmazonBedrockFullAccess`
- `AmazonSNSFullAccess`
- `AmazonS3ReadOnlyAccess`

---

## Setup and Deployment

### Prerequisites
- Python 3.10+
- Node.js 18+
- AWS CLI configured with appropriate credentials
- AWS account with Bedrock model access enabled for `anthropic.claude-3-haiku-20240307-v1:0`

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Preprocess data and train models
```bash
python pipeline/preprocess.py
python models/train_models.py
```

### 3. Provision AWS infrastructure
```bash
python deploy/setup_aws.py
```
This creates all AWS resources and writes `dashboard/.env` with `VITE_API_URL`.

### 4. Run the frontend
```bash
cd dashboard
npm install
npm run dev
```

### 5. Build for production
```bash
cd dashboard
npm run build
```

---

## Environment Variables

| Variable | File | Description |
|---|---|---|
| `VITE_API_URL` | `dashboard/.env` | API Gateway base URL |
| `VITE_AWS_REGION` | `dashboard/.env` | AWS region (default: us-east-1) |
| `FAULT_TABLE` | Lambda env | DynamoDB table name (default: crisis-grid-faults) |
| `SNS_TOPIC_ARN` | Lambda env | SNS topic ARN for critical alerts |

---

## Infrastructure Types and Fault Taxonomy

### Power
Faults: `normal`, `overload`, `line_fault`, `short_circuit`, `transformer_overheat`, `frequency_deviation`, `voltage_sag`, `earth_fault`

### Water
Faults: `water_leak`, `low_pressure`, `pump_failure`, `reservoir_overflow`

### Gas / LPG
Faults: `gas_leak`, `pressure_drop`, `pipeline_blockage`, `valve_malfunction`

### Communications
Faults: `tower_offline`, `signal_degradation`, `backhaul_failure`, `network_congestion`

### Physical / Civil
Faults: `structural_stress`, `excess_load`, `vibration_anomaly`, `inspection_overdue`

---

## Severity Levels

| Level | Failure Probability | Color |
|---|---|---|
| low | < 35% | Green |
| medium | 35–60% | Amber |
| high | 60–85% | Orange/Red |
| critical | > 85% | Red |

Emergency mode activates when `failure_probability > 0.85` and fault type is `short_circuit` or `line_fault`. Power is prioritised to hospitals, military, water treatment, and residential zones.
