/**
 * useDynamo.js — DynamoDB persistence hook
 *
 * Thin wrapper around the Lambda/API Gateway endpoint for writing records
 * to DynamoDB. All writes are fire-and-forget — errors are logged to the
 * console but never thrown, so they never break the UI.
 *
 * If VITE_API_URL is not set (local dev without AWS), all writes are
 * silently skipped with a console warning.
 *
 * Usage:
 *   const { writeReading, writeAsset, writePrediction, writeEvent } = useDynamo();
 *   writeReading(sensorReading); // non-blocking
 */

// API Gateway base URL — set in dashboard/.env after running deploy/setup_aws.py
const API_URL = import.meta.env.VITE_API_URL || null;
const API_KEY = import.meta.env.VITE_API_KEY || "";

/**
 * writeRecord — internal helper that POSTs an action + payload to the Lambda.
 * The Lambda routes the request to the correct DynamoDB table based on `action`.
 *
 * @param {string} action  - One of: writeReading, writeAsset, writePrediction, writeEvent
 * @param {object} payload - The record to persist
 * @returns {Promise<object|null>} Parsed response body, or null on error
 */
async function writeRecord(action, payload) {
  // Skip silently if the API URL hasn't been configured yet
  if (!API_URL) {
    console.error(`useDynamo: VITE_API_URL is not configured — skipping ${action}`);
    return null;
  }

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ action, payload }),
    });

    if (!resp.ok) {
      console.error(`useDynamo: ${action} failed with status ${resp.status}`);
      return null;
    }

    return await resp.json();
  } catch (err) {
    // Network error or Lambda timeout — log and continue
    console.error(`useDynamo: ${action} error —`, err);
    return null;
  }
}

export function useDynamo() {
  /** Writes a sensor reading to the crisis-grid-sensor-readings table */
  async function writeReading(reading) {
    return writeRecord("writeReading", reading);
  }

  /** Writes an asset definition to the crisis-grid-assets table */
  async function writeAsset(asset) {
    return writeRecord("writeAsset", asset);
  }

  /** Writes an ML prediction result to the crisis-grid-predictions table */
  async function writePrediction(prediction) {
    return writeRecord("writePrediction", prediction);
  }

  /** Writes a threshold-breach event to the crisis-grid-events table */
  async function writeEvent(event) {
    return writeRecord("writeEvent", event);
  }

  return { writeReading, writeAsset, writePrediction, writeEvent };
}
