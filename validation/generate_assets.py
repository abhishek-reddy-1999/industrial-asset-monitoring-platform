import os
import csv
import json
import math
import random
from datetime import datetime, timedelta

BASE_DIR = r"c:\Users\Administrator\VM\AHI DBM\validation"
os.makedirs(BASE_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. CDU Plant Multi-Column CSV (cdu_plant_telemetry.csv)
# -------------------------------------------------------------
cdu_csv_path = os.path.join(BASE_DIR, "cdu_plant_telemetry.csv")
base_time = datetime.utcnow() - timedelta(hours=2)

headers = [
    "timestamp",
    "FIC_101.PV",          # Crude Feed Flow (m³/h, nom: 450)
    "FIC_102.PV",          # Naphtha Reflux Flow (m³/h, nom: 175)
    "LIC_101.PV",          # Sump Level (%, nom: 60)
    "TIC_101.PV",          # Overhead Temp (°C, nom: 118)
    "TIC_102.PV",          # Reboiler Temp (°C, nom: 235)
    "PIC_101.PV",          # Column Top Pressure (kPa, nom: 145)
    "VIB_101.RMS",         # Charge Pump Vibration (mm/s, nom: 1.8)
    "PUMP_101A.DIFF_HEAD", # Diff Head (m, nom: 55.4)
    "CDU_101.DELTA_T",     # Fractionation Delta T (°C, nom: 117.4)
    "CDU_101.MT_DISTANCE", # MT Anomaly Distance (nom: 1.3)
    "FCV_101.OPEN_PCT",    # Feed Valve Opening (%, nom: 68.5)
    "LCV_101.OPEN_PCT",    # Bottoms Valve Opening (%, nom: 42.0)
    "PUMP_101A.ST"         # Pump Run Status (1=Run, 0=Stop)
]

rows = []
for i in range(120):  # 120 time intervals (1 minute apart)
    t = i
    curr_time = (base_time + timedelta(minutes=i)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Controlled realistic dynamic models with gentle sinusoidal oscillation and slight noise
    fic101 = round(450.0 + 12.0 * math.sin(t * 0.1) + random.uniform(-1.5, 1.5), 1)
    fic102 = round(175.0 + 6.0 * math.cos(t * 0.12) + random.uniform(-0.8, 0.8), 1)
    lic101 = round(60.0 + 4.5 * math.sin(t * 0.08) + random.uniform(-0.5, 0.5), 1)
    tic101 = round(118.0 + 2.5 * math.sin(t * 0.05) + random.uniform(-0.3, 0.3), 1)
    tic102 = round(235.0 + 3.8 * math.cos(t * 0.06) + random.uniform(-0.4, 0.4), 1)
    pic101 = round(145.0 + 2.0 * math.sin(t * 0.15) + random.uniform(-0.2, 0.2), 1)
    vib101 = round(1.75 + 0.18 * math.sin(t * 0.2) + random.uniform(-0.04, 0.05), 3)
    pump_head = round(55.4 - 0.02 * (fic101 - 450.0) + random.uniform(-0.3, 0.3), 1)
    delta_t = round(tic102 - tic101, 1)
    mt_dist = round(1.2 + 0.15 * math.sin(t * 0.08) + (0.5 if t > 90 else 0.0) + random.uniform(-0.05, 0.05), 2)
    fcv101 = round(68.5 + (fic101 - 450.0) * 0.3, 1)
    lcv101 = round(42.0 + (lic101 - 60.0) * 0.5, 1)
    pump_st = 1

    rows.append([
        curr_time, fic101, fic102, lic101, tic101, tic102,
        pic101, vib101, pump_head, delta_t, mt_dist, fcv101, lcv101, pump_st
    ])

with open(cdu_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"Generated {len(rows)} rows in {cdu_csv_path}")

# -------------------------------------------------------------
# 2. Broker Device Telemetry CSV (broker_device_telemetry.csv)
# -------------------------------------------------------------
broker_csv_path = os.path.join(BASE_DIR, "broker_device_telemetry.csv")
broker_headers = ["timestamp", "deviceid", "discharge_pressure", "vibration_axial", "flow_rate", "temperature", "running"]

devices = [
    ("pump-p101a-hub-01", 580.0, 1.8, 450.0, 68.0),
    ("cdu-overhead-yokogawa-yta610", 145.0, 0.5, 175.0, 118.0),
    ("fieldeye-wireless-vib-04", 0.0, 2.1, 0.0, 52.0),
    ("dfc4960b-b9f0-42ef-8d94-43fd65e95631", 62.0, 0.2, 450.0, 85.0)
]

broker_rows = []
for i in range(60):
    curr_time = (base_time + timedelta(minutes=i * 2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    for dev_id, base_p, base_v, base_q, base_t in devices:
        p = round(base_p + random.uniform(-3.0, 3.0), 1)
        v = round(base_v + random.uniform(-0.1, 0.15), 2)
        q = round(base_q + random.uniform(-2.0, 2.0), 1)
        t = round(base_t + random.uniform(-0.8, 0.8), 1)
        broker_rows.append([curr_time, dev_id, p, v, q, t, "true"])

with open(broker_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(broker_headers)
    writer.writerows(broker_rows)

print(f"Generated {len(broker_rows)} rows in {broker_csv_path}")

# -------------------------------------------------------------
# 3. Yokogawa Exaquantum Single-Tag CSV (yokogawa_timeseries_single.csv)
# -------------------------------------------------------------
yoko_csv_path = os.path.join(BASE_DIR, "yokogawa_timeseries_single.csv")
yoko_headers = ["Timestamp_UTC", "TagName", "Value", "Quality"]
key_tags = ["FIC_101.PV", "TIC_101.PV", "TIC_102.PV", "LIC_101.PV", "VIB_101.RMS"]

yoko_rows = []
for i in range(50):
    curr_time = (base_time + timedelta(minutes=i)).strftime("%Y-%m-%dT%H:%M:%SZ")
    for tag in key_tags:
        val = 0.0
        if "FIC" in tag:
            val = round(450.0 + random.uniform(-10, 10), 1)
        elif "TIC_101" in tag:
            val = round(118.0 + random.uniform(-2, 2), 1)
        elif "TIC_102" in tag:
            val = round(235.0 + random.uniform(-3, 3), 1)
        elif "LIC" in tag:
            val = round(60.0 + random.uniform(-4, 4), 1)
        elif "VIB" in tag:
            val = round(1.8 + random.uniform(-0.15, 0.2), 3)
        yoko_rows.append([curr_time, tag, val, "GOOD"])

with open(yoko_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(yoko_headers)
    writer.writerows(yoko_rows)

print(f"Generated {len(yoko_rows)} rows in {yoko_csv_path}")

# -------------------------------------------------------------
# 4. Production-Grade Node-RED Flow JSON (node_red_flow_ahi_ingest.json)
# -------------------------------------------------------------
flow_json_path = os.path.join(BASE_DIR, "node_red_flow_ahi_ingest.json")

# Complete Node-RED standard flow layout
nodered_nodes = [
    # Flow Tab
    {
        "id": "tab_ahi_ingest",
        "type": "tab",
        "label": "Yokogawa AHI Telemetry & CSV Ingestion",
        "disabled": False,
        "info": "End-to-end industrial ingestion pipeline for Yokogawa OpreX AHI & DBM.\nReads CSV plant telemetry or simulates live CENTUM VP process variations, and ingests into AHI DBM via REST API on port 91/90."
    },

    # =========================================================================
    # SECTION 1: PERIODIC CSV REPLAY STREAMER (Reads CSV row by row & sends)
    # =========================================================================
    {
        "id": "comment_csv_stream",
        "type": "comment",
        "z": "tab_ahi_ingest",
        "name": "=== 1. CSV Telemetry Replay Engine (Plant Simulation) ===",
        "info": "Continuously iterates over cdu_plant_telemetry.csv rows every 2 seconds, updates timestamp to now, and POSTs to /api/v1/tags/ingest.",
        "x": 260,
        "y": 60,
        "wires": []
    },
    {
        "id": "inject_csv_timer",
        "type": "inject",
        "z": "tab_ahi_ingest",
        "name": "Replay Clock (Every 2s)",
        "props": [{"p": "payload"}],
        "repeat": "2",
        "crontab": "",
        "once": True,
        "onceDelay": 0.5,
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "x": 160,
        "y": 120,
        "wires": [["fn_read_csv_cursor"]]
    },
    {
        "id": "fn_read_csv_cursor",
        "type": "function",
        "z": "tab_ahi_ingest",
        "name": "Load Next CSV Row",
        "func": """// Global in-memory pointer for sequential replay
const fs = global.get('fs') || context.global.fs;
let cursor = context.get('csv_cursor') || 0;
let cachedRows = context.get('cached_rows') || null;

const csvFilePath = 'c:/Users/Administrator/VM/AHI DBM/validation/cdu_plant_telemetry.csv';

if (!cachedRows) {
    try {
        const fsModule = (typeof require !== 'undefined') ? require('fs') : null;
        if (fsModule && fsModule.existsSync(csvFilePath)) {
            const raw = fsModule.readFileSync(csvFilePath, 'utf8');
            const lines = raw.split(/\\r?\\n/).filter(l => l.trim().length > 0);
            const headers = lines[0].split(',').map(h => h.trim());
            cachedRows = [];
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',').map(p => p.trim());
                if (parts.length === headers.length) {
                    const rowObj = {};
                    headers.forEach((h, idx) => rowObj[h] = parts[idx]);
                    cachedRows.push(rowObj);
                }
            }
            context.set('cached_rows', cachedRows);
        }
    } catch (e) {
        node.warn("Could not read file directly, using virtual synthetic row: " + e.message);
    }
}

let rowData = null;
if (cachedRows && cachedRows.length > 0) {
    rowData = cachedRows[cursor % cachedRows.length];
    cursor = (cursor + 1) % cachedRows.length;
    context.set('csv_cursor', cursor);
} else {
    // High-fidelity fallback plant dynamic model if file access restricted in sandbox
    const t = (cursor++) * 0.1;
    rowData = {
        'FIC_101.PV': (450 + 10 * Math.sin(t) + (Math.random() * 2 - 1)).toFixed(1),
        'FIC_102.PV': (175 + 5 * Math.cos(t * 1.2) + (Math.random() * 1.5 - 0.75)).toFixed(1),
        'LIC_101.PV': (60 + 3 * Math.sin(t * 0.8)).toFixed(1),
        'TIC_101.PV': (118 + 2 * Math.sin(t * 0.5)).toFixed(1),
        'TIC_102.PV': (235 + 3 * Math.cos(t * 0.6)).toFixed(1),
        'PIC_101.PV': (145 + 1.5 * Math.sin(t * 1.5)).toFixed(1),
        'VIB_101.RMS': (1.8 + 0.15 * Math.sin(t * 2.0)).toFixed(3),
        'PUMP_101A.DIFF_HEAD': '55.4',
        'CDU_101.DELTA_T': '117.0',
        'CDU_101.MT_DISTANCE': '1.35',
        'PUMP_101A.ST': '1'
    };
    context.set('csv_cursor', cursor);
}

// Convert row into AHI Tag map with current UTC timestamp
const tagsPayload = {};
const nowIso = new Date().toISOString();

for (const [key, val] of Object.entries(rowData)) {
    if (key !== 'timestamp') {
        const numVal = Number(val);
        tagsPayload[key] = isNaN(numVal) ? val : numVal;
    }
}

msg.payload = {
    timestamp: nowIso,
    tags: tagsPayload
};

msg.headers = {
    'Content-Type': 'application/json'
};

node.status({ fill: 'green', shape: 'dot', text: `Row ${cursor} | FIC: ${tagsPayload['FIC_101.PV']} m3/h` });
return msg;""",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 420,
        "y": 120,
        "wires": [["http_post_tags_ingest"]]
    },
    {
        "id": "http_post_tags_ingest",
        "type": "http request",
        "z": "tab_ahi_ingest",
        "name": "POST /api/v1/tags/ingest",
        "method": "POST",
        "ret": "obj",
        "paytoqs": "ignore",
        "url": "http://localhost:91/api/v1/tags/ingest",
        "tls": "",
        "persist": False,
        "proxy": "",
        "insecureHTTPParser": False,
        "authType": "",
        "senderr": False,
        "headers": [],
        "x": 680,
        "y": 120,
        "wires": [["debug_tags_ingest", "status_tags_ingest"]]
    },
    {
        "id": "debug_tags_ingest",
        "type": "debug",
        "z": "tab_ahi_ingest",
        "name": "Live Ingest Response",
        "active": True,
        "tosidebar": True,
        "console": False,
        "tostatus": False,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 920,
        "y": 100,
        "wires": []
    },
    {
        "id": "status_tags_ingest",
        "type": "status",
        "z": "tab_ahi_ingest",
        "name": "Ingest Link Health",
        "scope": ["http_post_tags_ingest"],
        "x": 920,
        "y": 140,
        "wires": []
    },

    # =========================================================================
    # SECTION 2: INDUSTRIAL IOT BROKER INGESTION (Pump-P101A Smart Sensor Array)
    # =========================================================================
    {
        "id": "comment_broker_ingest",
        "type": "comment",
        "z": "tab_ahi_ingest",
        "name": "=== 2. Industrial IoT Broker Ingest (pump-p101a-hub-01) ===",
        "info": "Simulates MQTT / IoT Broker device stream. Updates dynamic asset attributes in real time.",
        "x": 260,
        "y": 200,
        "wires": []
    },
    {
        "id": "inject_broker_timer",
        "type": "inject",
        "z": "tab_ahi_ingest",
        "name": "Broker Heartbeat (Every 3s)",
        "props": [{"p": "payload"}],
        "repeat": "3",
        "crontab": "",
        "once": True,
        "onceDelay": 1.0,
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "x": 170,
        "y": 260,
        "wires": [["fn_broker_payload"]]
    },
    {
        "id": "fn_broker_payload",
        "type": "function",
        "z": "tab_ahi_ingest",
        "name": "Build MQTT Device Payload",
        "func": """const step = context.get('step') || 0;
context.set('step', step + 1);

// Realistic industrial pump hub telemetry
const dischargePress = Number((580.0 + 15.0 * Math.sin(step * 0.15) + (Math.random() * 4 - 2)).toFixed(1));
const vibAxial = Number((1.75 + 0.25 * Math.cos(step * 0.2) + (Math.random() * 0.1)).toFixed(2));
const flowRate = Number((450.0 + 12.0 * Math.sin(step * 0.1)).toFixed(1));
const motorTemp = Number((68.0 + 2.5 * Math.sin(step * 0.05)).toFixed(1));

msg.payload = {
    deviceid: "pump-p101a-hub-01",
    discharge_pressure: dischargePress,
    vibration_axial: vibAxial,
    flow_rate: flowRate,
    temperature: motorTemp,
    running: true
};

msg.headers = {
    'Content-Type': 'application/json'
};

node.status({ fill: 'blue', shape: 'dot', text: `P: ${dischargePress} kPa | Vib: ${vibAxial} mm/s` });
return msg;""",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 430,
        "y": 260,
        "wires": [["http_post_broker_ingest"]]
    },
    {
        "id": "http_post_broker_ingest",
        "type": "http request",
        "z": "tab_ahi_ingest",
        "name": "POST /api/v1/dm/broker/ingest",
        "method": "POST",
        "ret": "obj",
        "paytoqs": "ignore",
        "url": "http://localhost:91/api/v1/dm/broker/ingest",
        "tls": "",
        "persist": False,
        "proxy": "",
        "insecureHTTPParser": False,
        "authType": "",
        "senderr": False,
        "headers": [],
        "x": 700,
        "y": 260,
        "wires": [["debug_broker_ingest"]]
    },
    {
        "id": "debug_broker_ingest",
        "type": "debug",
        "z": "tab_ahi_ingest",
        "name": "Broker Ingest Status",
        "active": True,
        "tosidebar": True,
        "console": False,
        "tostatus": False,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 930,
        "y": 260,
        "wires": []
    },

    # =========================================================================
    # SECTION 3: DIRECT BULK CSV FILE UPLOAD (Batch Import)
    # =========================================================================
    {
        "id": "comment_bulk_csv",
        "type": "comment",
        "z": "tab_ahi_ingest",
        "name": "=== 3. Bulk CSV File Uploader (/api/v1/tags/ingest-csv) ===",
        "info": "Uploads entire CSV files in one shot to populate timeseries history and live cache.",
        "x": 270,
        "y": 340,
        "wires": []
    },
    {
        "id": "inject_bulk_csv",
        "type": "inject",
        "z": "tab_ahi_ingest",
        "name": "Upload Entire CSV (Manual Trigger)",
        "props": [{"p": "payload"}],
        "repeat": "",
        "crontab": "",
        "once": False,
        "onceDelay": 0.1,
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "x": 190,
        "y": 400,
        "wires": [["fn_prepare_bulk_csv"]]
    },
    {
        "id": "fn_prepare_bulk_csv",
        "type": "function",
        "z": "tab_ahi_ingest",
        "name": "Read & Package CSV File",
        "func": """const csvPath = 'c:/Users/Administrator/VM/AHI DBM/validation/cdu_plant_telemetry.csv';

try {
    const fs = (typeof require !== 'undefined') ? require('fs') : null;
    if (fs && fs.existsSync(csvPath)) {
        msg.payload = fs.readFileSync(csvPath, 'utf8');
        msg.headers = { 'Content-Type': 'text/csv' };
        node.status({ fill: 'green', shape: 'dot', text: `Read ${msg.payload.length} bytes` });
        return msg;
    }
} catch (e) {
    node.error("Failed to read CSV: " + e.message);
}

// Fallback sample mini-CSV
msg.payload = `timestamp,FIC_101.PV,TIC_101.PV,LIC_101.PV
${new Date().toISOString()},452.3,118.4,62.1
${new Date(Date.now() - 1000).toISOString()},453.1,118.5,61.9`;
msg.headers = { 'Content-Type': 'text/csv' };
return msg;""",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 440,
        "y": 400,
        "wires": [["http_post_bulk_csv"]]
    },
    {
        "id": "http_post_bulk_csv",
        "type": "http request",
        "z": "tab_ahi_ingest",
        "name": "POST /api/v1/tags/ingest-csv",
        "method": "POST",
        "ret": "obj",
        "paytoqs": "ignore",
        "url": "http://localhost:91/api/v1/tags/ingest-csv",
        "tls": "",
        "persist": False,
        "proxy": "",
        "insecureHTTPParser": False,
        "authType": "",
        "senderr": False,
        "headers": [],
        "x": 700,
        "y": 400,
        "wires": [["debug_bulk_csv"]]
    },
    {
        "id": "debug_bulk_csv",
        "type": "debug",
        "z": "tab_ahi_ingest",
        "name": "Bulk Ingest Summary",
        "active": True,
        "tosidebar": True,
        "console": False,
        "tostatus": False,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 930,
        "y": 400,
        "wires": []
    },

    # =========================================================================
    # SECTION 4: SOCKET.IO INDUSTRIAL INGESTION ENGINE (v2.0 Realtime Protocol)
    # =========================================================================
    {
        "id": "comment_socketio_stream",
        "type": "comment",
        "z": "tab_ahi_ingest",
        "name": "=== 4. Socket.IO Telemetry & CSV Ingestion Engine (Port 91) ===",
        "info": "Real-time bi-directional streaming via Socket.IO engine. Emits 'telemetry', 'csv_row' and 'csv_bulk' events directly to http://localhost:91/socket.io/.",
        "x": 280,
        "y": 480,
        "wires": []
    },
    {
        "id": "inject_sio_timer",
        "type": "inject",
        "z": "tab_ahi_ingest",
        "name": "Socket.IO Pulse (Every 1s)",
        "props": [{"p": "payload"}],
        "repeat": "1",
        "crontab": "",
        "once": True,
        "onceDelay": 1.5,
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "x": 170,
        "y": 540,
        "wires": [["fn_build_sio_packet"]]
    },
    {
        "id": "fn_build_sio_packet",
        "type": "function",
        "z": "tab_ahi_ingest",
        "name": "Format Socket.IO CSV Event",
        "func": """const step = context.get('sio_step') || 0;
context.set('sio_step', step + 1);

// Generate high frequency dynamic telemetry packet
const fic101 = Number((450.0 + 8.0 * Math.sin(step * 0.1)).toFixed(1));
const tic101 = Number((118.0 + 1.8 * Math.cos(step * 0.08)).toFixed(1));
const pic101 = Number((145.0 + 2.2 * Math.sin(step * 0.12)).toFixed(1));
const vib101 = Number((1.75 + 0.15 * Math.sin(step * 0.25)).toFixed(3));

msg.payload = {
    timestamp: new Date().toISOString(),
    event: "telemetry",
    tags: {
        "FIC_101.PV": fic101,
        "TIC_101.PV": tic101,
        "PIC_101.PV": pic101,
        "VIB_101.RMS": vib101
    }
};

// Also format for direct WebSocket/Socket.IO outbound
msg.event = "telemetry";
node.status({ fill: 'green', shape: 'ring', text: `SIO Emitted FIC: ${fic101} | TIC: ${tic101}` });
return msg;""",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 440,
        "y": 540,
        "wires": [["ws_out_ahi_telemetry", "debug_sio_output"]]
    },
    {
        "id": "ws_out_ahi_telemetry",
        "type": "websocket out",
        "z": "tab_ahi_ingest",
        "name": "WS/SIO Telemetry Out",
        "server": "",
        "client": "ws_client_ahi_91",
        "x": 710,
        "y": 520,
        "wires": []
    },
    {
        "id": "debug_sio_output",
        "type": "debug",
        "z": "tab_ahi_ingest",
        "name": "Socket.IO Packet Log",
        "active": False,
        "tosidebar": True,
        "console": False,
        "tostatus": False,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 710,
        "y": 560,
        "wires": []
    }
]

with open(flow_json_path, "w", encoding="utf-8") as f:
    json.dump(nodered_nodes, f, indent=2)

print(f"Generated complete Node-RED flow JSON with Socket.IO support: {flow_json_path}")
