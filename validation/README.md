# Yokogawa OpreX AHI & DBM — Validation & Ingestion Suite

This directory contains ready-to-use **CSV plant datasets**, an automated **Python test runner**, and a complete **Node-RED flow** to ingest telemetry into the AHI DBM application.

---

## 1. Provided CSV Datasets

All files are located in `c:\Users\Administrator\VM\AHI DBM\validation\`:

| File | Format | Description | Target Endpoint |
| :--- | :--- | :--- | :--- |
| **[`cdu_plant_telemetry.csv`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/cdu_plant_telemetry.csv)** | Multi-Column | 120 rows of continuous plant operation for Atmospheric Distillation Unit C-101 and Charge Pump P-101A (Flows, Temps, Levels, Pressure, Pump Head, Vibration, Anomaly Score). | `POST /api/v1/tags/ingest` or `/tags/ingest-csv` |
| **[`broker_device_telemetry.csv`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/broker_device_telemetry.csv)** | Multi-Device | 240 rows of industrial IoT gateway data (`pump-p101a-hub-01`, `cdu-overhead-yokogawa-yta610`, `fieldeye-wireless-vib-04`). | `POST /api/v1/dm/broker/ingest` |
| **[`yokogawa_timeseries_single.csv`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/yokogawa_timeseries_single.csv)** | Standard Historian | 250 rows in Exaquantum / Centum VP historical format (`Timestamp_UTC,TagName,Value,Quality`). | `POST /api/v1/tags/ingest-csv` |

---

## 2. Node-RED Flow (`node_red_flow_ahi_ingest.json`)

The flow file is saved at:
[`c:\Users\Administrator\VM\AHI DBM\validation\node_red_flow_ahi_ingest.json`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/node_red_flow_ahi_ingest.json)

### How to Import into Node-RED:
1. Start Node-RED (if not already running, open terminal and type `node-red` or access `http://localhost:1880`).
2. Open your browser to `http://localhost:1880`.
3. Click the top-right **Hamburger Menu (≡)** → **Import**.
4. Click **select a file to import** and browse to:
   `c:\Users\Administrator\VM\AHI DBM\validation\node_red_flow_ahi_ingest.json`
5. Click **Import** and then hit the red **Deploy** button.

### What the Flow Contains:
* **Section 1: CSV Telemetry Replay Engine**:
  * An automated timer (every 2 seconds) reads the next row from `cdu_plant_telemetry.csv`.
  * Transforms the row into live plant tags with current UTC timestamp.
  * Sends `HTTP POST` to `http://localhost:91/api/v1/tags/ingest`.
  * Instantly broadcasts to the **WebSocket telemetry stream** so SCADA synoptics, gauges, and meters animate in real-time.
* **Section 2: IoT Device Broker Ingestion**:
  * Heartbeat timer sends realistic vibration, pressure, flow, and motor temperature payloads for `pump-p101a-hub-01`.
  * Sends `HTTP POST` to `http://localhost:91/api/v1/dm/broker/ingest`.
  * Evaluates runtime expressions, recalculates asset health, and monitors alarm thresholds.
* **Section 3: Direct Bulk CSV Upload**:
  * A single manual trigger reads the complete `cdu_plant_telemetry.csv` file and POSTs directly to `/api/v1/tags/ingest-csv`.
  * Populates hundreds of historical timeseries points into the database in one shot.

---

## 3. Instant Automated Python Validation Test

You can validate all ingestion paths without Node-RED at any time by running:

```powershell
.\backend\.venv\Scripts\python.exe validation\run_ingest_test.py
```

### Test Output:
```text
================================================================
YOKOGAWA OPREX AHI & DBM - CSV & NODE-RED INGESTION TEST SUITE
================================================================

--- 1. Testing CDU Plant Telemetry CSV Stream (/tags/ingest) ---
 -> Ingested row 1: 13 tags updated. Status=SUCCESS
 -> Ingested row 2: 13 tags updated. Status=SUCCESS
 -> Ingested row 3: 13 tags updated. Status=SUCCESS
 -> Ingested row 4: 13 tags updated. Status=SUCCESS
 -> Ingested row 5: 13 tags updated. Status=SUCCESS
 -> PASS: Plant Telemetry Ingestion operational.

--- 2. Testing IoT Broker Telemetry CSV (/dm/broker/ingest) ---
 -> Device pump-p101a-hub-01: Updated 2 attributes. Status=SUCCESS
 -> Device cdu-overhead-yokogawa-yta610: Updated 2 attributes. Status=SUCCESS
 -> Device fieldeye-wireless-vib-04: Updated 1 attributes. Status=SUCCESS
 -> Device dfc4960b-b9f0-42ef-8d94-43fd65e95631: Updated 2 attributes. Status=SUCCESS
 -> PASS: Broker Ingestion operational.

--- 3. Testing Bulk CSV File Upload (/tags/ingest-csv) ---
 -> Uploaded cdu_plant_telemetry.csv: Processed 120 rows, 1560 points ingested across 13 tags.
 -> Uploaded yokogawa_timeseries_single.csv: Processed 250 rows, 250 points ingested.
 -> PASS: Bulk CSV Ingestion operational.

--- 4. Verifying Data Reflection in Live Tags & Timeseries ---
 -> Total registered tags: 11, Tags with live values: 11
    - AHI_C101.HEALTH: 95.9 % (Quality: GOOD)
    - AHI_C101.MT_DIST: 1.33 score (Quality: GOOD)
    - FIC_101.PV: 458.6 m³/h (Quality: GOOD)
    - FIC_102.PV: 178.19 m³/h (Quality: GOOD)
    - Timeseries FIC_101.PV: 1200 historical data points returned (Avg: 450.82).
    - Timeseries TIC_101.PV: 1200 historical data points returned (Avg: 118.05).
 -> PASS: Telemetry and Timeseries queries fully operational.

================================================================
ALL INGESTION PROTOCOLS AND DATASETS VERIFIED 100% OPERATIONAL!
================================================================
```

---

## 4. Where to View Live Ingested Data in the Frontend (Port 90)

* **SCADA HMI / Fuxa Synoptic** (`http://localhost:90` → Select SCADA HMI):
  * **P-101A Charge Pump**: Impeller spins with real-time speed, status displays live head.
  * **TK-101 Feed Tank**: Fluid level dynamically oscillates based on `FIC_101.PV`.
  * **Digital Badges**: Real-time values update with zero delay via WebSocket.
* **Timeseries & Trends**:
  * Charts query `/api/v1/query/timeseries` and display smooth historical trend lines from the ingested CSV data points.
* **Asset Health & Alarms**:
  * If temperature or vibration exceeds configured limits (e.g. `VIB_101.RMS > 4.5 mm/s`), the rule engine trips and logs audit events.
