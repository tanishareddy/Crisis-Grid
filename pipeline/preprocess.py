"""
Crisis Grid — POWER Infrastructure Data Pipeline
Processes 3 Kaggle datasets and uploads to S3

Datasets:
  1. smart-energy-meters-in-bangalore-india
     columns: meter_id, timestamp, consumption_kwh, voltage, current, power_factor, location
  2. iot-enabled-smart-grid-dataset
     columns: timestamp, node_id, voltage_v, current_a, frequency_hz, active_power_kw,
              reactive_power_kvar, power_factor, fault_label, fault_type
  3. smart-grid-asset-monitoring-dataset
     columns: asset_id, asset_type, timestamp, temperature_c, load_percent,
              oil_level, vibration, health_score, maintenance_due

Place downloaded CSVs in data/raw/ before running.
If CSVs are not present, synthetic data is generated automatically.
"""
import pandas as pd
import numpy as np
import boto3
import os
from io import StringIO

S3_BUCKET = "crisis-grid-data-nimbus-1000"
REGION    = "us-east-1"

# Real BESCOM substation IDs mapped to Bangalore areas
BESCOM_SUBSTATIONS = [
    ("SUB_YELAHANKA",       "Yelahanka",       "North Bangalore",    220),
    ("SUB_WHITEFIELD",      "Whitefield",      "East Bangalore",     110),
    ("SUB_PEENYA",          "Peenya",          "West Bangalore",     220),
    ("SUB_ELECTRONIC_CITY", "Electronic City", "South Bangalore",    110),
    ("SUB_HEBBAL",          "Hebbal",          "North Bangalore",     66),
    ("SUB_MARATHAHALLI",    "Marathahalli",    "East Bangalore",      66),
    ("SUB_KORAMANGALA",     "Koramangala",     "South-East Bangalore",66),
    ("SUB_RAJAJINAGAR",     "Rajajinagar",     "West Bangalore",      66),
    ("SUB_YESHWANTHPUR",    "Yeshwanthpur",    "North-West Bangalore",66),
    ("SUB_BTM",             "BTM Layout",      "South Bangalore",     66),
    ("SUB_JP_NAGAR",        "JP Nagar",        "South Bangalore",     66),
    ("SUB_INDIRANAGAR",     "Indiranagar",     "East Bangalore",      66),
]

POWER_FAULT_TYPES = [
    "normal", "overload", "line_fault", "short_circuit",
    "transformer_overheat", "frequency_deviation", "voltage_sag", "earth_fault"
]


def load_or_generate_dataset1():
    """Dataset 1: smart-energy-meters-in-bangalore-india"""
    path = "data/raw/smart_energy_meters_bangalore.csv"
    if os.path.exists(path):
        print(f"Loading Dataset 1 from {path}")
        df = pd.read_csv(path)
        # normalise column names
        df = df.rename(columns={
            "Voltage": "voltage_v", "Current": "current_a",
            "PowerFactor": "power_factor", "consumption_kwh": "consumption_kwh",
        })
        return df[["voltage_v", "current_a", "power_factor", "consumption_kwh"]].dropna()
    else:
        print("Dataset 1 not found — generating synthetic smart meter data")
        n = 3000
        return pd.DataFrame({
            "voltage_v":       np.random.normal(230, 10, n),
            "current_a":       np.random.normal(48, 10, n),
            "power_factor":    np.random.normal(0.91, 0.05, n),
            "consumption_kwh": np.random.normal(900, 200, n),
        })


def load_or_generate_dataset2():
    """Dataset 2: iot-enabled-smart-grid-dataset"""
    path = "data/raw/iot_smart_grid.csv"
    if os.path.exists(path):
        print(f"Loading Dataset 2 from {path}")
        df = pd.read_csv(path)
        return df.dropna()
    else:
        print("Dataset 2 not found — generating synthetic IoT grid data")
        n = 4000
        df = pd.DataFrame({
            "voltage_v":          np.random.normal(220, 12, n),
            "current_a":          np.random.normal(50, 12, n),
            "frequency_hz":       np.random.normal(50, 0.3, n),
            "active_power_kw":    np.random.normal(11000, 1200, n),
            "reactive_power_kvar":np.random.normal(600, 200, n),
            "power_factor":       np.random.normal(0.91, 0.05, n),
            "fault_label":        0,
            "fault_type":         "normal",
        })
        # inject faults
        fault_idx = np.random.choice(n, int(n * 0.10), replace=False)
        for i in fault_idx:
            ft = np.random.choice(POWER_FAULT_TYPES[1:])
            df.loc[i, "fault_type"]  = ft
            df.loc[i, "fault_label"] = 1
            if ft == "overload":             df.loc[i, "current_a"] *= 1.85
            elif ft == "short_circuit":      df.loc[i, "current_a"] *= 3.2; df.loc[i, "voltage_v"] *= 0.3
            elif ft == "line_fault":         df.loc[i, "voltage_v"] *= 0.6; df.loc[i, "current_a"] *= 2.1
            elif ft == "frequency_deviation":df.loc[i, "frequency_hz"] += np.random.choice([-4.5, 4.5])
        return df


def load_or_generate_dataset3():
    """Dataset 3: smart-grid-asset-monitoring-dataset"""
    path = "data/raw/smart_grid_asset_monitoring.csv"
    if os.path.exists(path):
        print(f"Loading Dataset 3 from {path}")
        df = pd.read_csv(path)
        return df.rename(columns={"temperature_c": "transformer_temp_c"}).dropna()
    else:
        print("Dataset 3 not found — generating synthetic asset monitoring data")
        n = 3000
        return pd.DataFrame({
            "transformer_temp_c": np.random.normal(65, 14, n),
            "load_percent":       np.random.normal(70, 16, n),
            "oil_level_pct":      np.random.normal(90, 8, n),
            "vibration_mm_s":     np.random.normal(1.0, 0.5, n),
            "health_score":       np.random.normal(78, 15, n),
        })


def merge_and_enrich(ds1, ds2, ds3):
    """Merge all three datasets into unified power grid records"""
    n = min(len(ds1), len(ds2), len(ds3), 5000)
    ds1 = ds1.sample(n, random_state=42).reset_index(drop=True)
    ds2 = ds2.sample(n, random_state=42).reset_index(drop=True)
    ds3 = ds3.sample(n, random_state=42).reset_index(drop=True)

    merged = pd.DataFrame({
        "timestamp":           pd.date_range("2024-01-01", periods=n, freq="5min").astype(str),
        "substation_id":       np.random.choice([s[0] for s in BESCOM_SUBSTATIONS], n),
        # Dataset 1 columns
        "consumption_kwh":     ds1["consumption_kwh"].values,
        # Dataset 2 columns
        "voltage_v":           ds2["voltage_v"].values,
        "current_a":           ds2["current_a"].values,
        "frequency_hz":        ds2["frequency_hz"].values,
        "active_power_kw":     ds2["active_power_kw"].values,
        "reactive_power_kvar": ds2["reactive_power_kvar"].values,
        "power_factor":        ds2["power_factor"].values,
        "fault_label":         ds2["fault_label"].values,
        "fault_type":          ds2["fault_type"].values,
        # Dataset 3 columns
        "transformer_temp_c":  ds3["transformer_temp_c"].values,
        "load_percent":        ds3["load_percent"].values,
        "oil_level_pct":       ds3["oil_level_pct"].values,
        "vibration_mm_s":      ds3["vibration_mm_s"].values,
        "health_score":        ds3["health_score"].values,
    })

    # add severity
    merged["severity"] = "low"
    merged.loc[merged["load_percent"] > 85, "severity"] = "medium"
    merged.loc[merged["load_percent"] > 95, "severity"] = "high"
    merged.loc[merged["fault_label"] == 1, "severity"] = merged.loc[merged["fault_label"] == 1, "fault_type"].map({
        "overload": "medium", "line_fault": "high", "short_circuit": "critical",
        "transformer_overheat": "high", "frequency_deviation": "medium",
        "voltage_sag": "medium", "earth_fault": "high",
    }).fillna("medium")

    return merged


def upload_to_s3(df, key):
    s3 = boto3.client("s3", region_name=REGION)
    try:
        s3.head_bucket(Bucket=S3_BUCKET)
    except Exception:
        s3.create_bucket(Bucket=S3_BUCKET)
        print(f"Created S3 bucket: {S3_BUCKET}")
    buf = StringIO()
    df.to_csv(buf, index=False)
    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue())
    print(f"Uploaded {len(df)} records → s3://{S3_BUCKET}/{key}")


if __name__ == "__main__":
    os.makedirs("data/raw", exist_ok=True)

    ds1 = load_or_generate_dataset1()
    ds2 = load_or_generate_dataset2()
    ds3 = load_or_generate_dataset3()

    merged = merge_and_enrich(ds1, ds2, ds3)
    merged.to_csv("data/raw/power_grid_bangalore.csv", index=False)
    print(f"\nMerged dataset: {len(merged)} records")
    print(f"Fault events: {merged['fault_label'].sum()} ({merged['fault_label'].mean()*100:.1f}%)")
    print(f"Fault breakdown:\n{merged[merged['fault_label']==1]['fault_type'].value_counts()}")

    upload_to_s3(merged, "power/raw/power_grid_bangalore.csv")
    print("\nPipeline complete.")
