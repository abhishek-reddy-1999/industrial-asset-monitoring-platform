# Yokogawa OpreX AHI & DBM — Complete Manual Configuration Guide

> **Current System Status: 100% CLEAN CANVAS (0 Records)**  
> All pre-seeded dummy assets, fake devices, sample brokers, mock alarms, simulated historical points, and synthetic dashboards have been **permanently deleted**.  
> The database and application state are completely clean. You can now configure each entity manually from scratch through the web UI or REST API.

---

## 1. Quick Verification of Clean State

You can verify that all tables are at **0 rows** anytime by running:
```powershell
.\backend\.venv\Scripts\python.exe backend\check_db.py
```
**Current Status Output**:
```text
--- Table Counts ---
ahi_asset_health: 0 rows
alarm_events: 0 rows
alarm_rules: 0 rows
asset_nodes: 0 rows
dashboards: 0 rows
dm_activity_logs: 0 rows
dm_brokers: 0 rows
dm_devices: 0 rows
dm_function_block_executions: 0 rows
dm_function_block_templates: 0 rows
historical_points: 0 rows
tags: 0 rows
```

To wipe back to this clean canvas at any point in the future:
```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\wipe_entire_application.py
```
Or via HTTP:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/wipe-all" -Method POST
```

---

## 2. Recommended Configuration Workflow

For the smoothest setup, configure your system in this order:

```
┌────────────────────────┐
│ 1. Communication Broker│ (Where data enters: MQTT, OPC UA, Socket.IO, REST)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ 2. Device Registration │ (Physical/virtual transmitters, gateways, PLCs)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ 3. ISA-95 Asset Tree   │ (Enterprise ➔ Site ➔ Area ➔ Unit ➔ Equipment)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ 4. Metric Bindings     │ (Connect Device telemetry to Asset attributes)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ 5. Alarm Rules         │ (Set high/low thresholds & urgency levels)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ 6. Operational Dashboards│ (Build custom UI with Gauges, P&IDs, Trends)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ 7. Telemetry Ingestion │ (Stream data via CSV, Node-RED, or Python)
└────────────────────────┘
```

---

## 3. Step-by-Step Configuration Instructions

### Step 1: Configure a Communication Broker

Brokers are the network gateways where industrial telemetry enters the system.

#### Via Web UI:
1. Open the application at **`http://localhost:5174`** (or your local port).
2. Click **`DM (Device Manager)`** in the top navigation bar.
3. In the left DM menu, select **`Brokers & Gateways`**.
4. Click the blue **`+ Add Broker`** button.
5. Fill in your broker details:
   - **Broker Name**: e.g., `Plant MQTT Telemetry Broker`
   - **Broker Type**: Choose `MQTT`, `OPC UA`, `Socket.IO`, `Modbus TCP`, or `Broker REST API`.
   - **Endpoint URL**: e.g., `mqtt://127.0.0.1:1883` or `opc.tcp://127.0.0.1:4840`
   - **Port**: e.g., `1883` (MQTT) / `4840` (OPC UA) / `91` (REST/Socket.IO)
   - **Authentication**: Choose `Anonymous`, `Username / Password`, or `Token`.
6. Click **Save Broker**.

#### Via REST API (PowerShell / curl):
```powershell
$broker = @{
    name = "Field MQTT Telemetry Broker"
    broker_type = "MQTT"
    endpoint_url = "mqtt://127.0.0.1:1883"
    port = 1883
    telemetry_topic = "refinery/telemetry/#"
    status = "ONLINE"
    description = "Industrial edge MQTT broker for plant sensors"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/brokers" -Method POST -Headers @{"Content-Type"="application/json"} -Body $broker
```

---

### Step 1b: Configure Device Profiles & Templates (Section 9.6, Figure 4)

Device Profiles & Templates define expected telemetry schemas, parsing rules, transport protocols, and alarm threshold triggers.

#### Nested JSON Payload Parsing:
You can inject flat or **arbitrarily nested JSON payloads** (e.g., from modern edge gateways, multi-variable smart transmitters, or Node-RED). The parser automatically traverses nested dictionaries and lists, extracting dot-notation metric paths (e.g. `measurements.vibration.x_axis`).

#### Via Web UI:
1. In the DM navigation menu, select **`Device Templates`** (or **`Device Profiles`**).
2. Click **`+ New Device Profile`**.
3. Enter your template name (e.g. `Multi-Variable Pump Vibration Profile`) and click **Create Profile**.
4. Paste your raw JSON payload (including nested objects) into the **JSON Payload Message (Figure 4)** box:
   ```json
   {
     "deviceId": "pump-p101a-hub-01",
     "timestamp": "2026-10-10T03:30:00Z",
     "measurements": {
       "temperature": 68.4,
       "pressure": 142.1,
       "vibration": {
         "x_axis": 1.25,
         "y_axis": 0.88,
         "z_axis": 2.14
       }
     },
     "diagnostics": {
       "oil_level_pct": 94,
       "motor_tripped": false
     }
   }
   ```
5. Click **Parse Payload Message**:
   - The system automatically extracts all metric keys (e.g., `measurements.temperature`, `measurements.vibration.x_axis`, `diagnostics.motor_tripped`).
   - Automatically assigns data types (`Double`, `Int`, `Bool`, `Timestamp`, `Text`, `Device ID`) and expressions (e.g., `Math.Round(value, 2)`).
6. Click **Save Profile & Rules** in the top right to permanently persist the template to the database.

#### Via REST API (PowerShell / curl):
```powershell
$template = @{
    template_name = "Multi-Variable Pump Vibration Profile"
    sample_json = '{"deviceId":"pump-p101a-hub-01","measurements":{"temperature":68.4,"vibration":{"x_axis":1.25}}}'
    metric_keys = @(
        @{ key = "deviceId"; name = "deviceId"; type = "Device ID"; data_type = "Text"; enable = $true },
        @{ key = "measurements.temperature"; name = "measurements.temperature"; type = "Metric"; data_type = "Double"; expression = "Math.Round(value, 2)"; enable = $true },
        @{ key = "measurements.vibration.x_axis"; name = "measurements.vibration.x_axis"; type = "Metric"; data_type = "Double"; expression = "Math.Round(value, 2)"; enable = $true }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/device-templates" -Method POST -Headers @{"Content-Type"="application/json"} -Body $template
```

---

### Step 2: Create a Device & Define Metrics

Devices represent physical sensors, transmitters (e.g., Yokogawa YTA610, EJX110A), or IoT Edge Hubs.

#### Via Web UI:
1. In the DM navigation menu, select **`Device Explorer`**.
2. Click **`+ Add Device`** (or **`+ Register Device`**).
3. Enter device details:
   - **Device Identifier (Unique ID)**: e.g., `pump-p101a-hub-01`
   - **Device Name**: e.g., `Crude Feed Charge Pump P-101A Hub`
   - **Broker**: Select the broker created in Step 1.
   - **Connection String / Protocol**: e.g., `MQTT v3.1.1` or `REST API`
   - **Retention Days**: e.g., `90`
   - **Telemetry Metric Keys**: e.g., `discharge_pressure`, `bearing_vibration`, `flow_rate`, `temperature`
4. Click **Create Device**.

#### Via REST API:
```powershell
$device = @{
    identifier = "pump-p101a-hub-01"
    name = "Crude Feed Charge Pump P-101A Hub"
    broker = "Field MQTT Telemetry Broker"
    protocol = "MQTT"
    status = "Connected"
    metric_keys = @("discharge_pressure", "bearing_vibration", "flow_rate", "temperature")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/devices" -Method POST -Headers @{"Content-Type"="application/json"} -Body $device
```

---

### Step 3: Build Your ISA-95 Asset Hierarchy

The Asset Hierarchy organizes your plant according to ISA-95 standards:
**ENTERPRISE ➔ SITE ➔ AREA ➔ UNIT ➔ EQUIPMENT**

#### Via Web UI:
1. In the DM menu, select **`Asset Hierarchy`**.
2. Click **`+ Add Asset`** (or **`+ New Asset Node`**).
3. Fill in the hierarchy levels:
   - **Level**: `ENTERPRISE` (e.g., `My Energy Company`)
   - Then add a child at `SITE` (e.g., `Main Refinery Site`)
   - Then add a child at `AREA` (e.g., `Crude Distillation Complex`)
   - Then add a child at `UNIT` (e.g., `Atmospheric Distillation Unit C-101`)
   - Then add a child at `EQUIPMENT` (e.g., `Charge Pump P-101A`)
4. Click **Save Asset**.

#### Via REST API:
```powershell
# 1. Enterprise Root
$ent = Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/assets" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{
    name = "Yokogawa Plant Operations"
    level = "ENTERPRISE"
    description = "Corporate Enterprise"
} | ConvertTo-Json)

# 2. Site under Enterprise
$site = Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/assets" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{
    name = "Jurong Island Refinery"
    level = "SITE"
    parent_id = $ent.id
} | ConvertTo-Json)

# 3. Equipment under Site
$eq = Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/assets" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{
    name = "Crude Feed Charge Pump P-101A"
    level = "EQUIPMENT"
    parent_id = $site.id
} | ConvertTo-Json)
```

---

### Step 4: Bind Asset Attributes to Ingested Tags

Assign dynamic telemetry signals to your equipment:
1. Open your Equipment asset in **`Asset Hierarchy`**.
2. Go to the **`Attributes`** tab.
3. Click **`+ Add Dynamic Attribute`**:
   - **Attribute Name**: `Discharge Pressure`
   - **Target Tag / Metric**: `FIC_101.PV` (or `discharge_pressure`)
   - **Device**: Select `pump-p101a-hub-01`
   - **Unit of Measurement (UoM)**: `kPa` or `bar`
4. Click **Save Attribute**.

---

### Step 5: Configure Alarm Rules & Thresholds

Set automated alert limits (e.g., ISO-10816 vibration or overpressure alerts):

#### Via Web UI:
1. In the DM navigation menu, select **`Alarms & Events`**.
2. Click **`+ Create Alarm Rule`**.
3. Configure the rule:
   - **Rule Name**: `P-101A High Impeller Bearing Vibration`
   - **Monitored Signal**: `VIB_101.RMS` (or `bearing_vibration`)
   - **Alarm Type**: `Analog`
   - **High Limit (Warning)**: `2.8` mm/s
   - **High-High Limit (Trip)**: `4.5` mm/s
   - **Priority**: `High` or `Urgent`
   - **Notification Action**: Select Webhook / In-App Banner.
4. Click **Save Rule**.

#### Via REST API:
```powershell
$alarmRule = @{
    rule_name = "P-101A High Bearing Vibration"
    signal = "VIB_101.RMS"
    alarm_type = "Analog"
    high_threshold = 2.8
    high_high_threshold = 4.5
    priority = "High"
    severity = 700
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dm/alarm-rules" -Method POST -Headers @{"Content-Type"="application/json"} -Body $alarmRule
```

---

### Step 6: Create an Operational Dashboard & Add Widgets

#### Via Web UI:
1. Click **`DI (Data Insight)`** in the top navigation bar.
2. If on clean canvas, click the **`+ New Dashboard`** button in the dashboard dropdown:
   - **Title**: `Plant Operational Overview`
   - **Slug**: `plant-operational-overview`
   - **Category**: `Process Monitoring`
3. Click **Create Dashboard**.
4. Now click **`+ Add Widget`** in the navigation bar to pick your widgets:
   - **Gauge**: Overhead Pressure (`PIC_101.PV`, Min: 0, Max: 300 kPa)
   - **TimeSeries Trend**: Column Temperatures (`TIC_101.PV`, `TIC_102.PV`)
   - **Level Indicator**: Sump Tank Level (`LIC_101.PV`, 0 - 100%)
   - **P&ID Synoptic Diagram**: Atmospheric Distillation Mimic
   - **Alarms Table**: Embedded live alarms and acknowledge console
5. Drag and resize widgets on the grid to create your layout.
6. Click **`Save Layout`** (floppy disk icon in the top right).

#### Via REST API:
```powershell
$dash = @{
    title = "Plant Operational Overview"
    slug = "plant-operational-overview"
    category = "Process Monitoring"
    time_range = "now-15m"
    refresh_interval = "1s"
    layout = @(
        @{ id = "w1"; type = "gauge"; title = "Feed Pressure"; tags = @("PIC_101.PV"); min = 0; max = 300; unit = "kPa"; x = 0; y = 0; w = 4; h = 5 },
        @{ id = "w2"; type = "timeseries"; title = "Thermal Profile"; tags = @("TIC_101.PV", "TIC_102.PV"); x = 4; y = 0; w = 8; h = 5 },
        @{ id = "w3"; type = "alarms"; title = "Live Alarms"; tags = @(); x = 0; y = 5; w = 12; h = 5 }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/dashboards" -Method POST -Headers @{"Content-Type"="application/json"} -Body $dash
```

---

### Step 7: Ingest Real Telemetry via CSV or Node-RED

Now that your entities, tags, and widgets exist, inject real data into them!

#### Option A: Stream Rows from CSV via PowerShell
```powershell
$csv = Import-Csv "validation\cdu_plant_telemetry.csv"

# Send the first 5 rows with live timestamps
foreach ($row in ($csv | Select-Object -First 5)) {
    $tagsPayload = @{
        "FIC_101.PV" = [float]$row."FIC_101.PV"
        "TIC_101.PV" = [float]$row."TIC_101.PV"
        "PIC_101.PV" = [float]$row."PIC_101.PV"
        "VIB_101.RMS" = [float]$row."VIB_101.RMS"
        "PUMP_101A.ST" = [int]$row."PUMP_101A.ST"
    }
    $body = @{ tags = $tagsPayload } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/tags/ingest" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "Ingested row: FIC=$($row.'FIC_101.PV') m3/h | TIC=$($row.'TIC_101.PV') C"
    Start-Sleep -Seconds 1
}
```

#### Option B: Bulk Upload All CSV History in One Shot
```powershell
$content = Get-Content -Raw "validation\cdu_plant_telemetry.csv"
Invoke-RestMethod -Uri "http://127.0.0.1:91/api/v1/tags/ingest-csv" -Method POST -ContentType "text/csv" -Body $content
```

#### Option C: Ingest via Node-RED
1. Open Node-RED at `http://localhost:1880`.
2. Menu (≡) ➔ **Import** ➔ select [`validation/node_red_flow_ahi_ingest.json`](file:///c:/Users/Administrator/VM/AHI%20DBM/validation/node_red_flow_ahi_ingest.json).
3. Click **Deploy**.
4. The flow will stream rows every 2 seconds into `http://localhost:91/api/v1/tags/ingest`, immediately animating your widgets and P&ID synoptics via WebSockets.

---

## 4. How to Submit Improvements & Suggestions

As you configure each component manually, let me know any enhancements you would like:

- **New Widget Types**: Want specialized meters, radar charts, or custom SCADA symbols? Specify the sensor type and preferred display.
- **Protocol Converters**: Need customized MQTT topic parsers, Sparkplug B schemas, or Modbus register mappings?
- **Alarm Actions**: Need automated email, SMS, or incident webhook dispatch when limits are breached?
- **UI Customizations**: Need adjustments to font sizes, layout grid snapping, or color palettes?

Simply reply with what you'd like to improve or refine, and it will be updated immediately.
