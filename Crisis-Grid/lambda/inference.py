"""
Crisis Grid - Lambda Inference Function
Loads models from S3, runs predictions, returns decision support recommendations
"""
import json
import boto3
import joblib
import numpy as np
import os
import tempfile

S3_BUCKET = "crisis-grid-data"
FEATURES = ["voltage_v", "current_a", "frequency_hz", "power_kw", "transformer_temp_c", "load_percent", "power_factor"]

# cached models (persist across warm Lambda invocations)
_models = {}

def load_model(name):
    if name in _models:
        return _models[name]
    
    s3 = boto3.client("s3")
    tmp = tempfile.mktemp(suffix=".pkl")
    s3.download_file(S3_BUCKET, f"models/{name}.pkl", tmp)
    _models[name] = joblib.load(tmp)
    return _models[name]

def get_decision_support(fault_type, failure_prob, severity, zone):
    """Rule-based decision support engine"""
    actions = []
    notification = ""
    recovery_simulation = None
    
    if fault_type == "short_circuit":
        actions = [
            "IMMEDIATE: Isolate affected grid sector",
            f"Reroute power from {zone} to backup grid",
            "Deploy emergency repair crew - ETA 15 min",
            "Activate UPS for hospitals and critical facilities"
        ]
        notification = f"CRITICAL: Short circuit detected in {zone}. Emergency crews dispatched."
        recovery_simulation = {"type": "isolate_and_reroute", "zone": zone, "duration_min": 45}
        
    elif fault_type == "overload":
        actions = [
            f"Redistribute 30% load from {zone} to adjacent zones",
            "Activate demand response protocol",
            "Alert industrial consumers to reduce consumption",
            "Schedule transformer inspection within 2 hours"
        ]
        notification = f"WARNING: Overload detected in {zone}. Load redistribution in progress."
        recovery_simulation = {"type": "load_redistribution", "zone": zone, "duration_min": 10}
        
    elif fault_type == "line_fault":
        actions = [
            "Switch to alternate transmission line",
            "Deploy inspection drone to fault location",
            "Notify maintenance team for physical inspection",
            "Monitor adjacent lines for cascade risk"
        ]
        notification = f"ALERT: Line fault in {zone}. Switching to backup transmission."
        recovery_simulation = {"type": "line_switch", "zone": zone, "duration_min": 20}
        
    elif fault_type == "transformer_overheat":
        actions = [
            "Reduce transformer load by 25% immediately",
            "Activate cooling systems",
            "Schedule emergency maintenance inspection",
            "Prepare backup transformer for switchover"
        ]
        notification = f"WARNING: Transformer overheating in {zone}. Cooling activated."
        recovery_simulation = {"type": "cooling_activation", "zone": zone, "duration_min": 30}
        
    elif fault_type == "frequency_deviation":
        actions = [
            "Activate automatic frequency regulation",
            "Check generation-load balance",
            "Alert grid control center",
            "Monitor for cascade frequency collapse"
        ]
        notification = f"ALERT: Frequency deviation in {zone}. Regulation systems activated."
        recovery_simulation = {"type": "frequency_regulation", "zone": zone, "duration_min": 5}
    
    # emergency mode trigger
    emergency_mode = failure_prob > 0.85 and fault_type in ["short_circuit", "line_fault"]
    
    if emergency_mode:
        actions.insert(0, "EMERGENCY MODE: Prioritizing power to hospitals, military, water treatment, residential")
    
    return {
        "actions": actions,
        "notification": notification,
        "emergency_mode": emergency_mode,
        "recovery_simulation": recovery_simulation,
        "priority_zones": ["hospitals", "military_bases", "water_treatment", "residential"] if emergency_mode else []
    }

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else event
        
        # extract features
        features = [body.get(f, 0) for f in FEATURES]
        X = np.array(features).reshape(1, -1)
        zone = body.get("grid_zone", "Zone_A")
        
        # anomaly detection
        anomaly_bundle = load_model("anomaly_detector")
        X_scaled = anomaly_bundle["scaler"].transform(X)
        anomaly_score = anomaly_bundle["model"].decision_function(X_scaled)[0]
        is_anomaly = anomaly_bundle["model"].predict(X_scaled)[0] == -1
        
        # fault classification
        fault_bundle = load_model("fault_classifier")
        fault_probs = fault_bundle["model"].predict_proba(X)[0]
        fault_label = fault_bundle["model"].predict(X)[0]
        fault_type = fault_bundle["label_encoder"].inverse_transform([fault_label])[0]
        fault_confidence = float(max(fault_probs))
        
        # failure probability
        failure_model = load_model("failure_predictor")
        failure_prob = float(failure_model.predict_proba(X)[0][1])
        
        # severity
        if failure_prob > 0.85:
            severity = "critical"
        elif failure_prob > 0.60:
            severity = "high"
        elif failure_prob > 0.35:
            severity = "medium"
        else:
            severity = "low"
        
        # decision support
        decision = get_decision_support(fault_type, failure_prob, severity, zone) if is_anomaly or failure_prob > 0.4 else {
            "actions": ["System operating normally", "Continue standard monitoring"],
            "notification": "",
            "emergency_mode": False,
            "recovery_simulation": None,
            "priority_zones": []
        }
        
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({
                "zone": zone,
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": round(float(anomaly_score), 4),
                "fault_type": fault_type,
                "fault_confidence": round(fault_confidence, 4),
                "failure_probability": round(failure_prob, 4),
                "severity": severity,
                "decision_support": decision,
                "sensor_readings": dict(zip(FEATURES, features))
            })
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }
