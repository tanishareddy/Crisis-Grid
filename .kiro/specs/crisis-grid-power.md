# Crisis Grid — Power Infrastructure Spec

## Overview
AI-powered smart infrastructure failure detection and decision support system
for BESCOM Bangalore power grid. Built with Kiro spec-driven development.

## Problem Statement
Bangalore's power grid serves 12M+ citizens across 220kV/110kV/66kV networks.
Manual monitoring cannot detect early failure signals or coordinate emergency
response fast enough to prevent cascade outages.

## Why AI Is Required
- Rule-based systems cannot reason about novel fault combinations
- Cascade failure prediction requires multi-variable pattern recognition
- Natural language decision support reduces operator response time
- Bedrock Claude provides contextual recommendations beyond static rules

## AWS Services Used

| Service | Purpose | Integration |
|---------|---------|-------------|
| Amazon Bedrock (Claude 3.7 Sonnet) | AI decision support, cascade analysis, NL recommendations | Lambda → Bedrock API |
| AWS Lambda | Inference endpoint, Bedrock proxy, alert processor | REST API via API Gateway |
| Amazon API Gateway | Exposes Lambda as REST API to dashboard | HTTP API |
| Amazon S3 | Dataset storage, trained ML model storage | boto3 upload/download |
| Amazon DynamoDB | Fault event log, historical alerts, substation health history | boto3 put/query |
| Amazon SNS | Citizen notifications, operator alerts | Lambda trigger |

## Architecture

```
Kaggle Datasets (3x)
      ↓
Python ETL Pipeline → S3 (raw data)
      ↓
Local ML Training (XGBoost + IsolationForest + RandomForest)
      ↓
Models → S3 (models/)
      ↓
React Dashboard → API Gateway → Lambda
                                    ↓
                              Bedrock Claude 3.7 Sonnet
                              (decision support + cascade analysis)
                                    ↓
                              DynamoDB (fault log)
                                    ↓
                              SNS (citizen alerts)
```

## Features

### 1. Real-time Monitoring
- 12 BESCOM substations with live sensor simulation
- Columns from 3 Kaggle datasets (voltage, current, frequency, temp, load, health)
- Auto-refresh every 10 seconds

### 2. Anomaly Detection
- Isolation Forest for unsupervised anomaly detection
- XGBoost for fault classification (8 fault types)
- Random Forest for failure probability scoring

### 3. Cascade Failure Simulation
- Click any substation to trigger cascade
- Domino effect propagates through transmission network
- Visual animation on real Bangalore Leaflet map
- Shows which hospitals/military/water facilities lose power

### 4. Bedrock AI Decision Support
- Sends sensor readings + fault context to Claude 3.7 Sonnet
- Returns natural language analysis and recommendations
- References historical patterns from DynamoDB
- Generates citizen notification text

### 5. Emergency Mode
- Auto-activates on critical faults
- Prioritises: Hospitals → Military → Water Treatment → Residential
- Visual overlay on Bangalore map

### 6. Historical Analytics
- 14-day trend charts (temperature, load, voltage, failures)
- Future risk zone predictions
- Stored in DynamoDB, queried via Lambda

## Kiro MCP Integration
- AWS Documentation MCP server configured at .kiro/settings/mcp.json
- Used during development for Bedrock API reference, DynamoDB schema design,
  Lambda deployment patterns, and SNS notification setup

## Data Sources
1. kaggle: smart-energy-meters-in-bangalore-india
2. kaggle: iot-enabled-smart-grid-dataset
3. kaggle: smart-grid-asset-monitoring-dataset

## Tasks

- [x] Project scaffolding and React dashboard
- [x] Bangalore map with real BESCOM substations
- [x] Live sensor simulation from Kaggle dataset columns
- [x] Anomaly detection and fault classification
- [x] Decision support rule engine
- [x] Emergency mode with priority routing
- [x] Historical analytics charts
- [x] Kiro spec document
- [x] AWS MCP server configuration
- [x] Amazon Bedrock integration (Claude 3.7 Sonnet)
- [x] DynamoDB fault event logging
- [x] Cascade failure simulation
- [x] Lambda deployment package
- [x] API Gateway configuration
- [x] SNS citizen notifications
