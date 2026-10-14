import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:91"

def test_api():
    print("[1] Testing Microservices Status API...")
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dm/services/status")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode('utf-8'))
        print(f"    Architecture: {data['architecture']}, Services count: {len(data['services'])}")
        for s in data['services']:
            print(f"      - {s['name']}: {s['status']} ({s['port']}, {s['latency_ms']}ms)")

    print("\n[2] Testing Protocol Verification API...")
    # Test HTTP
    payload = json.dumps({"protocol": "HTTP", "host": "127.0.0.1", "port": 91, "timeout_seconds": 3}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dm/protocols/test-connection", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"    HTTP Ping result: status={res['status']}, latency={res['latency_ms']}ms, message={res['message']}")
        assert res['success'] is True

    # Test Socket.IO
    payload = json.dumps({"protocol": "SOCKETIO", "host": "127.0.0.1", "port": 91, "timeout_seconds": 3}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dm/protocols/test-connection", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"    Socket.IO Ping result: status={res['status']}, latency={res['latency_ms']}ms, message={res['message']}")
        assert res['success'] is True

    # Test MQTT test connection (will test broker handshake)
    payload = json.dumps({"protocol": "MQTT", "host": "127.0.0.1", "port": 1883, "timeout_seconds": 1}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dm/protocols/test-connection", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"    MQTT Port 1883 Check: status={res['status']}, message={res['message']}")

    print("\n[3] Testing UI Generation & Validation Engine...")
    gen_payload = json.dumps({
        "process_unit": "Distillation Column C-101",
        "primary_tags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV"],
        "include_machinery": True,
        "include_datatable": True,
        "include_kpis": True
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dashboards/generate-ui", data=gen_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        gen_res = json.loads(resp.read().decode('utf-8'))
        print(f"    Generated Dashboard Title: {gen_res['title']}")
        print(f"    Total Panels: {gen_res['widgets_count']}")
        print(f"    Validation Score: {gen_res['validation_score']}%")
        print(f"    Validation Checks: {len(gen_res['validation_checks'])}")
        for chk in gen_res['validation_checks']:
            print(f"      [{chk['status']}] {chk['check']}: {chk['detail']}")
        assert gen_res['validation_score'] >= 90

    print("\n[4] Testing Asset Template Deployment with Custom Device ID...")
    tpl_payload = json.dumps({
        "template_id": "tmpl-pump",
        "device_id": "PUMP-DEV-VAL-01",
        "asset_name": "Centrifugal Feed Pump 01 (Validated)"
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dm/asset-templates/deploy", data=tpl_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        dep_res = json.loads(resp.read().decode('utf-8'))
        print(f"    Single Deploy Success: {dep_res['message']}, Asset ID: {dep_res['asset']['id']}")
        assert len(dep_res['asset']['attributes']) > 0

    print("\n[5] Testing Asset Template Batch Deployment with Multiple Device IDs...")
    batch_payload = json.dumps({
        "template_id": "tmpl-pump",
        "device_ids": ["PUMP-DEV-BATCH-A", "PUMP-DEV-BATCH-B"]
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/dm/asset-templates/deploy", data=batch_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        batch_res = json.loads(resp.read().decode('utf-8'))
        print(f"    Batch Deploy Success: {batch_res['message']}, Assets Created: {len(batch_res['created_assets'])}, Total Assets in Store: {len(batch_res['assets'])}")
        assert len(batch_res['created_assets']) == 2
        for a in batch_res['created_assets']:
            print(f"      - Asset: {a['name']}")

    print("\nALL 5 INTEGRATION SUITES PASSED PERFECTLY!")

if __name__ == "__main__":
    test_api()
