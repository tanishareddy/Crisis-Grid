"""
Crisis Grid — Bedrock AI Decision Support Handler

Entry point: lambda_handler(event, context)

Request flow:
  1. Validate API key from x-api-key header
  2. Parse and validate substation ID, fault type, sensor readings, severity, failure probability
  3. Skip Bedrock if fault is normal or probability < 35% (saves cost)
  4. Fetch recent fault history for this substation from DynamoDB
  5. Build a structured prompt for Claude 3 Haiku with full substation context
  6. Call Bedrock and parse the JSON response
  7. Log the fault + AI analysis to DynamoDB (30-day TTL)
  8. Publish an SNS citizen alert if severity is high or critical
  9. Return the analysis to the frontend

Environment variables (set by deploy/setup_aws.py):
  FAULT_TABLE      — DynamoDB table name (default: crisis-grid-faults)
  SNS_TOPIC_ARN    — SNS topic ARN for citizen alerts
  ALLOWED_ORIGIN   — Frontend origin for CORS (default: https://your-domain.com)
  API_KEY          — Secret key required in x-api-key header
"""
import json
import boto3
import os
from datetime import datetime

# AWS service clients — all in us-east-1
bedrock  = boto3.client("bedrock-runtime", region_name="us-east-1")
dynamodb = boto3.resource("dynamodb",       region_name="us-east-1")
sns      = boto3.client("sns",              region_name="us-east-1")

# DynamoDB table name and SNS topic ARN — injected via Lambda environment variables
FAULT_TABLE     = os.environ.get("FAULT_TABLE", "crisis-grid-faults")
SNS_TOPIC       = os.environ.get("SNS_TOPIC_ARN", "")
ALLOWED_ORIGIN  = os.environ.get("ALLOWED_ORIGIN", "https://your-domain.com")
API_KEY         = os.environ.get("API_KEY", "")

# Valid values for strict input validation
VALID_FAULT_TYPES = {
    "normal", "short_circuit", "overload", "transformer_overheat",
    "line_fault", "frequency_deviation", "voltage_sag", "earth_fault",
}
VALID_SEVERITIES = {"low", "medium", "high", "critical"}

# ── Substation metadata ───────────────────────────────────────────────────────
# Static context for all 12 BESCOM substations.
# Included in the Bedrock prompt so Claude can reason about capacity and location.
SUBSTATION_CONTEXT = {
    "SUB_YELAHANKA":       {"name": "Yelahanka",       "kv": 220, "area": "North Bangalore", "capacity_mva": 315},
    "SUB_WHITEFIELD":      {"name": "Whitefield",      "kv": 110, "area": "East Bangalore",  "capacity_mva": 160},
    "SUB_PEENYA":          {"name": "Peenya",          "kv": 220, "area": "West Bangalore",  "capacity_mva": 250},
    "SUB_ELECTRONIC_CITY": {"name": "Electronic City", "kv": 110, "area": "South Bangalore", "capacity_mva": 200},
    "SUB_HEBBAL":          {"name": "Hebbal",          "kv": 66,  "area": "North Bangalore", "capacity_mva": 100},
    "SUB_MARATHAHALLI":    {"name": "Marathahalli",    "kv": 66,  "area": "East Bangalore",  "capacity_mva": 80},
    "SUB_KORAMANGALA":     {"name": "Koramangala",     "kv": 66,  "area": "South-East",      "capacity_mva": 90},
    "SUB_RAJAJINAGAR":     {"name": "Rajajinagar",     "kv": 66,  "area": "West Bangalore",  "capacity_mva": 75},
    "SUB_YESHWANTHPUR":    {"name": "Yeshwanthpur",    "kv": 66,  "area": "NW Bangalore",    "capacity_mva": 85},
    "SUB_BTM":             {"name": "BTM Layout",      "kv": 66,  "area": "South Bangalore", "capacity_mva": 70},
    "SUB_JP_NAGAR":        {"name": "JP Nagar",        "kv": 66,  "area": "South Bangalore", "capacity_mva": 80},
    "SUB_INDIRANAGAR":     {"name": "Indiranagar",     "kv": 66,  "area": "East Bangalore",  "capacity_mva": 95},
}

# ── Power reroute paths ───────────────────────────────────────────────────────
# For each substation, lists the substations that can absorb its load
# if it needs to be isolated. Included in the Bedrock prompt.
REROUTE_PATHS = {
    "SUB_YELAHANKA":       ["SUB_PEENYA", "SUB_HEBBAL"],
    "SUB_WHITEFIELD":      ["SUB_MARATHAHALLI", "SUB_INDIRANAGAR"],
    "SUB_PEENYA":          ["SUB_YELAHANKA", "SUB_YESHWANTHPUR"],
    "SUB_ELECTRONIC_CITY": ["SUB_KORAMANGALA", "SUB_BTM"],
    "SUB_HEBBAL":          ["SUB_YELAHANKA", "SUB_YESHWANTHPUR"],
    "SUB_MARATHAHALLI":    ["SUB_WHITEFIELD", "SUB_INDIRANAGAR"],
    "SUB_KORAMANGALA":     ["SUB_BTM", "SUB_INDIRANAGAR"],
    "SUB_RAJAJINAGAR":     ["SUB_PEENYA", "SUB_YESHWANTHPUR"],
    "SUB_YESHWANTHPUR":    ["SUB_PEENYA", "SUB_RAJAJINAGAR"],
    "SUB_BTM":             ["SUB_KORAMANGALA", "SUB_JP_NAGAR"],
    "SUB_JP_NAGAR":        ["SUB_BTM", "SUB_KORAMANGALA"],
    "SUB_INDIRANAGAR":     ["SUB_MARATHAHALLI", "SUB_KORAMANGALA"],
}

# ── Cascade failure risk map ──────────────────────────────────────────────────
# For each substation, lists the downstream substations most likely to be
# affected if this one fails. Used in the Bedrock prompt for cascade risk assessment.
CASCADE_MAP = {
    "SUB_YELAHANKA":       ["SUB_HEBBAL", "SUB_YESHWANTHPUR"],
    "SUB_PEENYA":          ["SUB_RAJAJINAGAR", "SUB_YESHWANTHPUR"],
    "SUB_WHITEFIELD":      ["SUB_MARATHAHALLI", "SUB_INDIRANAGAR"],
    "SUB_ELECTRONIC_CITY": ["SUB_KORAMANGALA", "SUB_BTM", "SUB_JP_NAGAR"],
    "SUB_HEBBAL":          ["SUB_YESHWANTHPUR"],
    "SUB_MARATHAHALLI":    ["SUB_INDIRANAGAR"],
    "SUB_KORAMANGALA":     ["SUB_BTM"],
    "SUB_BTM":             ["SUB_JP_NAGAR"],
}


def ask_bedrock(prompt):
    """
    Call Claude 3 Haiku via Amazon Bedrock.

    Uses the Messages API format required by Anthropic models on Bedrock.
    max_tokens=512 is sufficient for the structured JSON response we expect.

    Returns the raw text content of Claude's response (should be valid JSON).
    """
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}]
    })
    response = bedrock.invoke_model(
        modelId="anthropic.claude-3-haiku-20240307-v1:0",
        body=body,
        contentType="application/json",
        accept="application/json"
    )
    result = json.loads(response["body"].read())
    return result["content"][0]["text"]


def build_bedrock_prompt(substation_id, fault_type, readings, failure_prob, severity, history):
    """
    Build the structured prompt sent to Claude 3 Haiku.

    Includes:
      - Substation name, voltage level, capacity, and area
      - Fault type and failure probability
      - All 7 sensor readings
      - Last 3 fault history entries from DynamoDB (for pattern context)
      - Available reroute paths (so Claude can suggest load transfer)
      - Cascade risk targets (so Claude can warn about downstream impact)

    Claude is instructed to respond ONLY with valid JSON matching a fixed schema.
    """
    sub = SUBSTATION_CONTEXT.get(substation_id, {})
    reroute = [SUBSTATION_CONTEXT.get(r, {}).get("name", r) for r in REROUTE_PATHS.get(substation_id, [])]
    cascade = [SUBSTATION_CONTEXT.get(c, {}).get("name", c) for c in CASCADE_MAP.get(substation_id, [])]

    history_text = ""
    if history:
        history_text = f"\nRecent fault history at this substation: {json.dumps(history[-3:], default=str)}"

    return f"""You are an AI grid operator for BESCOM (Bangalore Electricity Supply Company).
A fault has been detected at a power substation. Analyse it and respond in JSON.

SUBSTATION: {sub.get('name', substation_id)} ({sub.get('area', '')})
VOLTAGE LEVEL: {sub.get('kv', '?')}kV | CAPACITY: {sub.get('capacity_mva', '?')} MVA
FAULT TYPE: {fault_type.replace('_', ' ').upper()}
FAILURE PROBABILITY: {failure_prob * 100:.1f}%
SEVERITY: {severity.upper()}

SENSOR READINGS:
- Voltage: {readings.get('voltage_v', 0):.1f}V
- Current: {readings.get('current_a', 0):.1f}A
- Frequency: {readings.get('frequency_hz', 50):.2f}Hz
- Transformer Temp: {readings.get('transformer_temp_c', 0):.1f}°C
- Load: {readings.get('load_percent', 0):.1f}%
- Health Score: {readings.get('health_score', 0):.0f}/100
- Power Factor: {readings.get('power_factor', 0):.3f}
{history_text}

AVAILABLE REROUTE PATHS: {', '.join(reroute)}
POTENTIAL CASCADE RISK TO: {', '.join(cascade) if cascade else 'None'}

Respond ONLY with valid JSON in this exact format:
{{
  "analysis": "2-3 sentence technical analysis of what is happening and why",
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "cascade_risk": "assessment of cascade failure risk to neighbouring substations",
  "estimated_restoration": "time estimate for restoration",
  "citizen_message": "one sentence public notification for BESCOM app",
  "confidence": "high/medium/low"
}}"""


def log_to_dynamodb(substation_id, fault_type, severity, failure_prob, bedrock_analysis):
    """
    Persist a fault event and its AI analysis to DynamoDB.

    Table: crisis-grid-faults
    PK: substation_id (HASH)
    SK: fault_id (RANGE) — format: SUB_PEENYA_20260315103000

    TTL is set to 30 days from now so old records are automatically purged.
    Errors are caught and logged — a DynamoDB failure should never crash the Lambda.
    """
    try:
        table = dynamodb.Table(FAULT_TABLE)
        table.put_item(Item={
            "fault_id":         f"{substation_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "substation_id":    substation_id,
            "timestamp":        datetime.utcnow().isoformat(),
            "fault_type":       fault_type,
            "severity":         severity,
            "failure_prob":     str(failure_prob),
            "ai_analysis":      bedrock_analysis.get("analysis", ""),
            "actions":          json.dumps(bedrock_analysis.get("immediate_actions", [])),
            "citizen_message":  bedrock_analysis.get("citizen_message", ""),
            "ttl":              int(datetime.utcnow().timestamp()) + 86400 * 30,
        })
    except Exception as e:
        print(f"DynamoDB log error: {e}")


def get_fault_history(substation_id):
    """
    Fetch the 5 most recent fault records for a substation from DynamoDB.

    Used to give Claude historical context so it can detect recurring patterns.
    Returns an empty list if the query fails (e.g. table doesn't exist yet).
    """
    try:
        table = dynamodb.Table(FAULT_TABLE)
        resp = table.query(
            KeyConditionExpression="substation_id = :sid",
            ExpressionAttributeValues={":sid": substation_id},
            Limit=5,
            ScanIndexForward=False,
        )
        return resp.get("Items", [])
    except Exception:
        return []


def send_sns_alert(substation_name, citizen_message, severity):
    """
    Publish a citizen-facing alert to the SNS topic.

    Only called for high and critical severity faults.
    The citizen_message is written by Claude in plain language suitable
    for a public BESCOM app notification.

    Skipped silently if SNS_TOPIC_ARN is not configured.
    """
    if not SNS_TOPIC:
        return
    try:
        sns.publish(
            TopicArn=SNS_TOPIC,
            Subject=f"BESCOM Alert — {severity.upper()} at {substation_name}",
            Message=citizen_message,
        )
    except Exception as e:
        print(f"SNS error: {e}")


def lambda_handler(event, context):
    """
    Main Lambda entry point — called by API Gateway on POST /analyze.

    Expected request body (JSON):
      substation_id      — e.g. "SUB_PEENYA"
      fault_type         — e.g. "transformer_overheat"
      sensor_readings    — dict of voltage_v, current_a, frequency_hz, etc.
      failure_probability — float 0.0–1.0
      severity           — "low" | "medium" | "high" | "critical"

    Response body (JSON) — Bedrock analysis schema:
      analysis, immediate_actions, cascade_risk,
      estimated_restoration, citizen_message, confidence, source
    """
    # CORS headers — locked to the configured frontend origin
    headers = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,x-api-key",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Content-Type": "application/json",
    }

    # Handle CORS preflight
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 204, "headers": headers, "body": ""}

    # ── API key check ─────────────────────────────────────────────────────────
    if API_KEY:
        request_key = (event.get("headers") or {}).get("x-api-key", "")
        if request_key != API_KEY:
            return {
                "statusCode": 401,
                "headers": headers,
                "body": json.dumps({"error": "Unauthorized"}),
            }

    try:
        body = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else event

        # ── Input validation ──────────────────────────────────────────────────
        substation_id = str(body.get("substation_id", "")).strip()
        fault_type    = str(body.get("fault_type", "")).strip()
        severity      = str(body.get("severity", "low")).strip().lower()
        readings      = body.get("sensor_readings", {})

        if substation_id not in SUBSTATION_CONTEXT:
            return {"statusCode": 400, "headers": headers,
                    "body": json.dumps({"error": f"Invalid substation_id: {substation_id}"})}

        if fault_type not in VALID_FAULT_TYPES:
            return {"statusCode": 400, "headers": headers,
                    "body": json.dumps({"error": f"Invalid fault_type: {fault_type}"})}

        if severity not in VALID_SEVERITIES:
            return {"statusCode": 400, "headers": headers,
                    "body": json.dumps({"error": f"Invalid severity: {severity}"})}

        try:
            failure_prob = float(body.get("failure_probability", 0))
            if not (0.0 <= failure_prob <= 1.0):
                raise ValueError()
        except (TypeError, ValueError):
            return {"statusCode": 400, "headers": headers,
                    "body": json.dumps({"error": "failure_probability must be a float between 0 and 1"})}

        if not isinstance(readings, dict):
            return {"statusCode": 400, "headers": headers,
                    "body": json.dumps({"error": "sensor_readings must be an object"})}

        # Sanitize sensor readings — only allow known numeric fields
        allowed_reading_keys = {
            "voltage_v", "current_a", "frequency_hz",
            "transformer_temp_c", "load_percent", "health_score", "power_factor",
        }
        readings = {
            k: float(v) for k, v in readings.items()
            if k in allowed_reading_keys and isinstance(v, (int, float))
        }

        # only call Bedrock for actual anomalies
        if fault_type == "normal" or failure_prob < 0.35:
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "analysis": "All parameters within BESCOM operating limits.",
                    "immediate_actions": ["Continue standard monitoring"],
                    "cascade_risk": "None",
                    "estimated_restoration": "N/A",
                    "citizen_message": "",
                    "confidence": "high",
                    "source": "normal",
                })
            }

        # get history from DynamoDB
        history = get_fault_history(substation_id)

        # call Bedrock
        prompt   = build_bedrock_prompt(substation_id, fault_type, readings, failure_prob, severity, history)
        raw      = ask_bedrock(prompt)
        analysis = json.loads(raw)

        # log to DynamoDB
        log_to_dynamodb(substation_id, fault_type, severity, failure_prob, analysis)

        # send SNS if critical
        if severity in ("critical", "high"):
            sub_name = SUBSTATION_CONTEXT.get(substation_id, {}).get("name", substation_id)
            send_sns_alert(sub_name, analysis.get("citizen_message", ""), severity)

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({**analysis, "source": "bedrock"})
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "analysis": "Analysis unavailable — malformed AI response.",
                "immediate_actions": ["Check system logs"],
                "cascade_risk": "Unknown",
                "estimated_restoration": "Unknown",
                "citizen_message": "",
                "confidence": "low",
                "source": "bedrock_raw",
            })
        }
    except Exception as e:
        print(f"lambda_handler error: {e}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": "Internal server error"}),
        }
