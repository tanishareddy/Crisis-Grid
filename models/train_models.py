"""
Crisis Grid — ML Model Training

Trains three models on the preprocessed Bangalore power grid dataset:

  1. Anomaly Detector  (Isolation Forest)
     — Unsupervised. Flags readings that deviate from normal operating patterns.
     — Saved as: data/anomaly_detector.pkl  (includes StandardScaler)

  2. Fault Classifier  (XGBoost)
     — Supervised. Classifies the type of fault from sensor readings.
     — Classes: normal, overload, line_fault, short_circuit,
                transformer_overheat, frequency_deviation, voltage_sag, earth_fault
     — Saved as: data/fault_classifier.pkl  (includes LabelEncoder)

  3. Failure Predictor (Random Forest)
     — Supervised. Predicts binary failure probability (will fail / won't fail).
     — class_weight="balanced" handles the imbalanced fault dataset.
     — Saved as: data/failure_predictor.pkl

All three models are uploaded to S3 after training so the inference Lambda
can load them on cold start.

Run: python models/train_models.py
"""
import pandas as pd
import numpy as np
import boto3
import joblib
import os
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from xgboost import XGBClassifier

# S3 bucket where trained models are stored (must match inference.py)
S3_BUCKET = "crisis-grid-data"

# The 7 sensor features used by all three models
# Must match the feature order expected by inference.py
FEATURES = ["voltage_v", "current_a", "frequency_hz", "active_power_kw", "transformer_temp_c", "load_percent", "power_factor"]

def load_data():
    """Load the preprocessed power grid dataset from data/raw/."""
    base = os.path.dirname(os.path.abspath(__file__))
    df = pd.read_csv(os.path.join(base, "../data/raw/power_grid_bangalore.csv"))
    return df

def train_anomaly_detector(df):
    """
    Train an Isolation Forest anomaly detector.

    Isolation Forest is unsupervised — it doesn't need fault labels.
    It isolates anomalies by randomly partitioning the feature space;
    anomalies require fewer splits to isolate (shorter path length).

    contamination=0.1 means we expect ~10% of readings to be anomalous,
    which matches the fault injection rate in the preprocessing pipeline.

    The StandardScaler is saved alongside the model so inference.py
    can apply the same scaling to live sensor readings.
    """
    print("Training anomaly detector...")
    X = df[FEATURES]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
    model.fit(X_scaled)
    
    joblib.dump({"model": model, "scaler": scaler}, "../data/anomaly_detector.pkl")
    print("Anomaly detector trained.")
    return model, scaler

def train_fault_classifier(df):
    """
    Train an XGBoost multi-class fault classifier.

    Classifies sensor readings into one of 8 fault types:
      normal, overload, line_fault, short_circuit,
      transformer_overheat, frequency_deviation, voltage_sag, earth_fault

    The LabelEncoder is saved with the model so inference.py can convert
    the numeric prediction back to a human-readable fault type string.

    Prints a full classification report on the test set for evaluation.
    """
    print("Training fault classifier...")
    fault_df = df.copy()
    
    le = LabelEncoder()
    fault_df["fault_label"] = le.fit_transform(fault_df["fault_type"])
    
    X = fault_df[FEATURES]
    y = fault_df["fault_label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = XGBClassifier(n_estimators=100, max_depth=4, random_state=42, eval_metric="mlogloss")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    joblib.dump({"model": model, "label_encoder": le}, "../data/fault_classifier.pkl")
    print("Fault classifier trained.")
    return model, le

def train_failure_predictor(df):
    """
    Train a Random Forest binary failure predictor.

    Predicts whether a reading will result in a failure (fault_label=1).
    class_weight="balanced" compensates for the imbalanced dataset
    (only ~10% of readings are faults).

    The predict_proba output is used in inference.py to return a
    continuous failure_probability score (0.0–1.0).
    """
    print("Training failure predictor...")
    X = df[FEATURES]
    y = df["fault_label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)
    
    print(f"Failure predictor accuracy: {model.score(X_test, y_test):.2%}")
    
    joblib.dump(model, "../data/failure_predictor.pkl")
    print("Failure predictor trained.")
    return model

def upload_models_to_s3():
    """
    Upload all three trained model files to S3.

    The inference Lambda downloads them on cold start and caches them
    in memory across warm invocations to avoid repeated S3 downloads.

    S3 path: s3://crisis-grid-data/models/<model_name>.pkl
    """
    s3 = boto3.client("s3", region_name="us-east-1")
    models = ["anomaly_detector.pkl", "fault_classifier.pkl", "failure_predictor.pkl"]
    
    for model_file in models:
        path = f"../data/{model_file}"
        if os.path.exists(path):
            s3.upload_file(path, S3_BUCKET, f"models/{model_file}")
            print(f"Uploaded {model_file} to S3")

if __name__ == "__main__":
    df = load_data()
    print(f"Loaded {len(df)} records")
    
    train_anomaly_detector(df)
    train_fault_classifier(df)
    train_failure_predictor(df)
    upload_models_to_s3()
    
    print("\nAll models trained and uploaded to S3.")
