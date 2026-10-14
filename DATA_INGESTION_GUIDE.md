# Yokogawa OpreX AHI & DBM — Real Data Ingestion & Node-RED Guide

> **Clean System Status**: All simulated background generators, dummy historical points, and mock frontend data have been completely removed. The system is operating in **100% Real External Ingestion Mode**. Every tag reading, timeseries chart, alarm event, and health metric reflects only real data injected via CSV, Node-RED, REST API, MQTT, or OPC UA.

---

## 1. What Was Removed & Cleaned

1. **Background Plant Simulator**: Set `enable_simulator = False` in [`backend/app/config.py`](file:///c:/Users/Administrator/VM/AHI%20DBM/backend/app/config.py). The sinusoidal background generator is permanently disabled.
2. **Purged Historical Database**: Truncated 4.1+ million simulated entries from `historical_points` and reset `alarm_events`. Database starts with **0 historical rows**.
3. **Frontend Clean-Up**:
   - **[`AssetListPanel.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/panels/AssetListPanel.jsx)**: Removed hardcoded `mockAssets` array; now connects to live `/api/v1/dm/assets` and real telemetry tags.
   - **[`AlarmsTablePanel.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/panels/AlarmsTablePanel.jsx)**: Removed hardcoded fallback mock alarms (`alm-01`, `alm-02`, `alm-03`); now strictly reflects actual active alarms from `/api/v1/dm/alarms`.
   - **[`BrokerEntityView.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/dm/BrokerEntityView.jsx)**: Removed mock client sessions and randomized `Math.random()` sniffer packet generator; sessions are now derived directly from registered DM devices.
   - **[`MasterAssetDashboard.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/di/MasterAssetDashboard.jsx)** & **[`WidgetStudioView.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/views/dm/WidgetStudioView.jsx)**: Removed artificial telemetry jitter timers; now fetch actual tag snapshots from `/api/v1/tags/snapshot`.
   - **[`StateTimelinePanel.jsx`](file:///c:/Users/Administrator/VM/AHI%20DBM/frontend/src/panels/StateTimelinePanel.jsx)**: Removed randomized timeline generator; now derives states directly from discrete tag values (`PUMP_101A.ST`).

---

## 2. Ingestion Endpoints Reference

The backend operates on port **`91`** (`http://127.0.0.1:91`):

| Ingestion Path | Protocol / Method | Endpoint | Payload Format | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Real-time Tag Streaming** | HTTP POST | `/api/v1/tags/ingest` | JSON (`{"tags": {...}}`) | Ingests live tag values, saves to Timeseries DB, publishes to Redis, and broadcasts live over WebSocket. |
| **Bulk CSV Historical Upload** | HTTP POST | `/api/v1/tags/ingest-csv` | `text/csv` | Bulk uploads multi-tag or single-tag CSV data with UTC timestamps into `historical_points`. |
| **IoT Device Broker Ingest** | HTTP POST | `/api/v1/dm/broker/ingest` | JSON (`{"deviceid": "...", ...}`) | Ingests industrial IoT device telemetry, evaluates dynamic attributes, recalculates AHI health index, and evaluates alarm rules. |
| **Telemetry Purge / Reset** | HTTP POST | `/api/v1/dm/purge-telemetry` | Empty Body | Truncates `historical_points` and `alarm_events`, clearing Redis cache so you can test fresh datasets anytime. |

---

## 3. Ready-To-Use CSV Datasets

Pre-formatted industrial datasets are located in [`validation/`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/):

### File 1: [`cdu_plant_telemetry.csv`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/cdu_plant_telemetry.csv)
Multi-column plant DCS telemetry for Atmospheric Distillation Unit C-101 and Crude Feed Pump P-101A:
```csv
timestamp,FIC_101.PV,FIC_102.PV,LIC_101.PV,TIC_101.PV,TIC_102.PV,PIC_101.PV,VIB_101.RMS,PUMP_101A.DIFF_HEAD,CDU_101.DELTA_T,CDU_101.MT_DISTANCE,FCV_101.OPEN_PCT,LCV_101.OPEN_PCT,PUMP_101A.ST
2026-10-06T00:50:07Z,450.9,180.7,59.9,117.9,239.0,145.2,1.797,55.2,121.1,1.25,68.8,42.0,1
2026-10-06T00:51:07Z,451.1,180.9,60.4,118.4,239.1,145.5,1.817,55.1,120.7,1.18,68.8,42.2,1
```

### File 2: [`broker_device_telemetry.csv`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/broker_device_telemetry.csv)
IoT Device telemetry for Edge Gateways and Wireless Transmitters (`pump-p101a-hub-01`, `cdu-overhead-yokogawa-yta610`, `fieldeye-wireless-vib-04`):
```csv
timestamp,deviceid,discharge_pressure,vibration_axial,flow_rate,temperature,running
2026-10-06T00:50:07Z,pump-p101a-hub-01,582.8,1.81,448.3,68.5,true
2026-10-06T00:50:07Z,cdu-overhead-yokogawa-yta610,147.8,0.53,175.3,118.7,true
```

### File 3: [`yokogawa_timeseries_single.csv`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/yokogawa_timeseries_single.csv)
Standard Historian format (Yokogawa Exaquantum / Centum VP historical log):
```csv
Timestamp_UTC,TagName,Value,Quality
2026-10-05T00:00:00Z,FIC_101.PV,448.5,GOOD
2026-10-05T00:01:00Z,FIC_101.PV,451.2,GOOD
```

---

## 4. Step-By-Step CSV Ingestion

### Method A: Single-Command Automated Validation Test
Run the test runner to verify all ingestion paths and view live reflections:
```powershell
.\backend\.venv\Scripts\python.exe validation\run_ingest_test.py
```

### Method B: Ingesting Live Tags via PowerShell (Streaming Simulation)
To stream an individual live reading into the system:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    tags = @{
        "FIC_101.PV" = 462.4
        "TIC_101.PV" = 119.5
        "PIC_101.PV" = 146.8
        "VIB_101.RMS" = 1.95
        "PUMP_101A.ST" = 1
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/tags/ingest" -Method POST -Headers $headers -Body $body
```

### Method C: Bulk CSV Upload via PowerShell
To upload an entire CSV dataset containing hundreds of historical points:
```powershell
$csvContent = Get-Content -Raw "validation\cdu_plant_telemetry.csv"
Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/tags/ingest-csv" -Method POST -ContentType "text/csv" -Body $csvContent
```

### Method D: Ingesting IoT Broker Device Telemetry (Flat & Nested JSON)
To push telemetry for a specific IoT device:

#### Option 1: Standard Flat Payload:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$payload = @{
    deviceid = "pump-p101a-hub-01"
    discharge_pressure = 585.2
    vibration_axial = 2.15
    flow_rate = 452.0
    temperature = 69.4
    running = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/broker/ingest" -Method POST -Headers $headers -Body $payload
```

#### Option 2: Nested JSON Payload (Arbitrary Sub-objects & Arrays):
The ingestion engine automatically resolves dot-notation metrics (e.g. `measurements.vibration.x_axis`):
```powershell
$headers = @{ "Content-Type" = "application/json" }
$nestedPayload = @{
    deviceId = "pump-p101a-hub-01"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    measurements = @{
        temperature = 68.4
        pressure = 142.1
        vibration = @{
            x_axis = 1.25
            y_axis = 0.88
            z_axis = 2.14
        }
    }
    diagnostics = @{
        oil_level_pct = 94
        motor_tripped = $false
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/broker/ingest" -Method POST -Headers $headers -Body $nestedPayload
```

---

## 5. Step-By-Step Node-RED Integration

A complete industrial Node-RED flow has been prepared:
[`validation/node_red_flow_ahi_ingest.json`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/node_red_flow_ahi_ingest.json)

### Step 1: Open Node-RED
1. Ensure Node-RED is running (`node-red` or accessed via your local/VM instance).
2. Open your web browser to `http://localhost:1880`.

### Step 2: Import the Flow
1. Click the top-right menu **≡ (Hamburger Menu)** → **Import**.
2. Click **select a file to import** and browse to:
   `c:\Users\Administrator\VM\AHI DBM\validation\node_red_flow_ahi_ingest.json`
3. Click **Import**.
4. Click the red **Deploy** button in the top-right corner.

### Step 3: Understanding the Flow Sections
The imported tab **"Yokogawa AHI Telemetry & CSV Ingestion"** contains 3 modular sections:

```
[ Replay Clock (2s) ] ──> [ Load Next CSV Row ] ──> [ HTTP POST /api/v1/tags/ingest ] ──> [ Status & Live Broadcast ]
[ IoT Heartbeat (5s) ] ──> [ Build Device Payload ] ──> [ HTTP POST /api/v1/dm/broker/ingest ] ──> [ Health & Alarms ]
[ Manual Button ] ────> [ Read CSV File ] ──────> [ HTTP POST /api/v1/tags/ingest-csv ] ───> [ Bulk History Populated ]
```

1. **Section 1: CSV Telemetry Replay Engine**:
   - Loops through `cdu_plant_telemetry.csv` row by row every 2 seconds.
   - Automatically injects current UTC timestamp and POSTs to `/api/v1/tags/ingest`.
   - The backend publishes each frame to Redis Pub/Sub, which immediately pushes over WebSocket to animate gauges, P&ID mimics, and ECharts bars in real-time.
2. **Section 2: IoT Device Broker Ingestion**:
   - Sends real-time vibration, pressure, and temperature packets for `pump-p101a-hub-01`.
   - Hits `/api/v1/dm/broker/ingest` to evaluate runtime expressions and monitor ISO-10816 vibration thresholds.
3. **Section 3: Direct Bulk CSV Upload**:
   - Single-click manual trigger reading the whole CSV file and POSTing to `/api/v1/tags/ingest-csv`.

---

## 6. How to Verify Injected Data in the UI

Open the web frontend at `http://localhost:5174` (or your configured port):

### 1. Plant Overview Dashboard (`/` or `diSubView === 'dashboard'`)
- **P&ID Synoptic Diagram**: Observe the live numeric bubbles on column C-101 and pump P-101A dynamically update with values matching your CSV / Node-RED stream.
- **Overhead Pressure Gauge (PIC_101.PV)**: Needle animates to match incoming pressure.
- **Column Sump Level Indicator (LIC_101.PV)**: Level liquid height moves in sync with ingested level percentages.
- **Column Thermal Profile**: Timeseries curves plot the exact historical data points ingested from the CSV.

### 2. Asset Twin View (`diSubView === 'assets'`)
- Click **"Asset Twin"** in the top navigation bar.
- Select **Atmospheric Distillation Unit C-101** or **Crude Feed Charge Pump P-101A**.
- View live temperature, pressure, flow rate, and vibration with real-time operational status (RUNNING / STOPPED) reflecting your ingested telemetry.

### 3. Data Management Explorer (`view === 'dm'`)
- Click **"Data Management (DM)"** in the top header.
- **Devices**: View device `pump-p101a-hub-01`, its `ONLINE` status, and real-time attribute values updated by `/dm/broker/ingest`.
- **Alarms**: Ingest a pressure > 300 kPa or vibration > 3.0 mm/s to see active alarms appear immediately in the real alarm console.

---

## 7. How to Purge / Reset Anytime

If you want to clear all historical points and start with a clean slate for a fresh demonstration or test run:

### Via REST API:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/purge-telemetry" -Method POST
```

### Via Python Script:
```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\purge_dummy_data.py
```
This resets `historical_points` to 0 rows and clears the Redis live cache, leaving all asset models and dashboard layouts intact.
