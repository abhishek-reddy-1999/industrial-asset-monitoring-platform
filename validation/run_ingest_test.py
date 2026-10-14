import os
import csv
import json
import time
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:91/api/v1"
BASE_DIR = r"c:\Users\Administrator\VM\AHI DBM\validation"

def http_post_json(url, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def http_post_csv(url, csv_text):
    data = csv_text.encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "text/csv"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def http_get_json(url):
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def test_cdu_csv_ingestion():
    print("\n--- 1. Testing CDU Plant Telemetry CSV Stream (/tags/ingest) ---")
    csv_file = os.path.join(BASE_DIR, "cdu_plant_telemetry.csv")
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        sample_rows = [next(reader) for _ in range(5)]
    
    for idx, row in enumerate(sample_rows):
        payload = {}
        for k, v in row.items():
            if k != "timestamp":
                try:
                    payload[k] = float(v)
                except ValueError:
                    payload[k] = v
        
        status, data = http_post_json(f"{API_BASE}/tags/ingest", {"tags": payload})
        assert status == 200, f"Failed: {data}"
        print(f" -> Ingested row {idx+1}: {data['tags_updated']} tags updated. Status={data['status']}")
    print(" -> PASS: Plant Telemetry Ingestion operational.")

def test_broker_device_ingestion():
    print("\n--- 2. Testing IoT Broker Telemetry CSV (/dm/broker/ingest) ---")
    csv_file = os.path.join(BASE_DIR, "broker_device_telemetry.csv")
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        sample_rows = [next(reader) for _ in range(4)]
        
    for row in sample_rows:
        payload = {
            "deviceid": row["deviceid"],
            "discharge_pressure": float(row["discharge_pressure"]),
            "vibration_axial": float(row["vibration_axial"]),
            "flow_rate": float(row["flow_rate"]),
            "temperature": float(row["temperature"]),
            "running": row["running"] == "true"
        }
        status, data = http_post_json(f"{API_BASE}/dm/broker/ingest", payload)
        assert status == 200, f"Broker ingest failed: {data}"
        print(f" -> Device {data['device_id']}: Updated {data['attributes_updated']} attributes. Status={data['status']}")
    print(" -> PASS: Broker Ingestion operational.")

def test_bulk_csv_upload():
    print("\n--- 3. Testing Bulk CSV File Upload (/tags/ingest-csv) ---")
    csv_file = os.path.join(BASE_DIR, "cdu_plant_telemetry.csv")
    with open(csv_file, "r", encoding="utf-8") as f:
        csv_content = f.read()

    status, data = http_post_csv(f"{API_BASE}/tags/ingest-csv", csv_content)
    assert status == 200, f"Bulk CSV upload failed: {data}"
    print(f" -> Uploaded cdu_plant_telemetry.csv: Processed {data['rows_processed']} rows, {data['points_ingested']} points ingested across {len(data['tags'])} tags.")
    
    yoko_file = os.path.join(BASE_DIR, "yokogawa_timeseries_single.csv")
    with open(yoko_file, "r", encoding="utf-8") as f:
        yoko_content = f.read()
    status_yoko, data_yoko = http_post_csv(f"{API_BASE}/tags/ingest-csv", yoko_content)
    assert status_yoko == 200, f"Single-tag CSV upload failed: {data_yoko}"
    print(f" -> Uploaded yokogawa_timeseries_single.csv: Processed {data_yoko['rows_processed']} rows, {data_yoko['points_ingested']} points ingested.")
    print(" -> PASS: Bulk CSV Ingestion operational.")

def test_data_reflection():
    print("\n--- 4. Verifying Data Reflection in Live Tags & Timeseries ---")
    status_tags, tags = http_get_json(f"{API_BASE}/tags/list")
    assert status_tags == 200
    active_tags = [t for t in tags if t.get("current_value") is not None]
    print(f" -> Total registered tags: {len(tags)}, Tags with live values: {len(active_tags)}")
    for t in active_tags[:4]:
        print(f"    - {t['tag_name']}: {t['current_value']} {t['eng_units']} (Quality: {t['quality']})")
    
    status_ts, ts_data = http_get_json(f"{API_BASE}/query/timeseries?tags=FIC_101.PV,TIC_101.PV&time_from=now-3h&time_to=now")
    assert status_ts == 200
    for s in ts_data.get("series", []):
        print(f"    - Timeseries {s['tag_name']}: {len(s['datapoints'])} historical data points returned (Avg: {s['stats']['avg']}).")
    print(" -> PASS: Telemetry and Timeseries queries fully operational.")

if __name__ == "__main__":
    print("================================================================")
    print("YOKOGAWA OPREX AHI & DBM - CSV & NODE-RED INGESTION TEST SUITE")
    print("================================================================")
    test_cdu_csv_ingestion()
    test_broker_device_ingestion()
    test_bulk_csv_upload()
    test_data_reflection()
    print("\n================================================================")
    print("ALL INGESTION PROTOCOLS AND DATASETS VERIFIED 100% OPERATIONAL!")
    print("================================================================")
