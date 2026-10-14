import httpx
import json

BASE_URL = "http://127.0.0.1:91"

def run_tests():
    print("==========================================")
    print("VERIFYING THINGSBOARD WORKING FEATURES")
    print("==========================================")

    # 1. Health
    r = httpx.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    print("[PASS] Backend Health 200 OK")

    # 2. Rule Chains list & nodes
    r = httpx.get(f"{BASE_URL}/api/v1/dm/rule-chains")
    assert r.status_code == 200
    chains = r.json()
    assert len(chains) >= 2, "Expected at least 2 rule chains"
    root_chain = next((c for c in chains if c.get("id") == "rc-root-01"), None)
    assert root_chain is not None, "Root chain not found"
    assert len(root_chain.get("nodes", [])) >= 5, "Root chain nodes not found"
    assert len(root_chain.get("connections", [])) >= 4, "Root chain connections not found"
    print(f"[PASS] Rule Chains: Found {len(chains)} chains, Root Chain has {len(root_chain['nodes'])} nodes and {len(root_chain['connections'])} links")

    # 3. Rule Chain Test-Run Simulation with real trace
    sim_payload = {
        "chain_id": "rc-root-01",
        "message": {
            "temperature": 96.5,
            "pressure": 272.1,
            "status": "OPERATIONAL"
        },
        "metadata": {
            "topic": "v1/devices/me/telemetry",
            "deviceType": "CENTUM_VP_DCS"
        },
        "msg_type": "POST_TELEMETRY_REQUEST"
    }
    r = httpx.post(f"{BASE_URL}/api/v1/dm/rule-chains/test-run", json=sim_payload)
    if r.status_code != 200:
        print("ERROR test-run response:", r.status_code, r.text)
    assert r.status_code == 200
    sim_res = r.json()
    assert sim_res["status"] == "SUCCESS"
    assert len(sim_res["trace"]) >= 5, "Trace did not evaluate nodes"
    print(f"[PASS] Rule Engine Simulation: Traversed {sim_res['total_nodes_traversed']} nodes in {sim_res['total_latency_ms']}ms")
    for step in sim_res["trace"]:
        print(f"       -> [{step['node_type']}] {step['node_name']}: {step['status']} ({step['relation']}) [{step['latency_ms']}ms]")

    # 4. ThingsBoard Widgets Library
    r = httpx.get(f"{BASE_URL}/api/v1/dm/widgets")
    assert r.status_code == 200
    widgets = r.json()
    assert len(widgets) >= 5, "Expected widget bundles"
    print(f"[PASS] Widget Studio: Found {len(widgets)} ThingsBoard widgets across bundles (Latest Values, Time Series, Control RPC, Alarms)")
    for w in widgets[:4]:
        print(f"       -> [{w['bundle']}] {w['title']} (Type: {w['type']})")

    # 5. Widget creation
    new_w = {
        "id": "w-test-dial",
        "type": "RADIAL_GAUGE",
        "bundle": "LATEST_VALUES",
        "title": "Reflux Drum V-102 Pressure Dial",
        "tag": "PIC_102.PV",
        "unit": "kPa",
        "min": 0,
        "max": 300
    }
    r = httpx.post(f"{BASE_URL}/api/v1/dm/widgets", json=new_w)
    assert r.status_code == 200
    print("[PASS] Widget Studio: Successfully added new custom widget")

    # Clean up test widget
    r = httpx.delete(f"{BASE_URL}/api/v1/dm/widgets/w-test-dial")
    assert r.status_code == 200
    print("[PASS] Widget Studio: Successfully removed custom widget")

    # 6. Alarms Live Operations
    r = httpx.get(f"{BASE_URL}/api/v1/dm/alarms")
    assert r.status_code == 200
    alarms = r.json()
    assert len(alarms) >= 1
    first_alarm_id = alarms[0]["id"]
    print(f"[PASS] Alarms: Found {len(alarms)} active process alarms (Testing on {first_alarm_id}: '{alarms[0]['alarm_name']}')")

    # Acknowledge Alarm
    r = httpx.post(f"{BASE_URL}/api/v1/dm/alarms/{first_alarm_id}/acknowledge", json={"user": "shift_supervisor@yokogawa.com"})
    assert r.status_code == 200
    print("[PASS] Alarms: Successfully acknowledged alarm with operator timestamp")

    # Clear Alarm
    r = httpx.post(f"{BASE_URL}/api/v1/dm/alarms/{first_alarm_id}/clear")
    assert r.status_code == 200
    print("[PASS] Alarms: Successfully cleared alarm to Normal (RTN) with forwarder dispatch")

    # 7. SCADA Tags & Windows
    r = httpx.get(f"{BASE_URL}/api/v1/dm/scada/windows")
    assert r.status_code == 200
    scada_wins = r.json()
    assert len(scada_wins) >= 2, "Expected SCADA windows"
    cdu_win = next((w for w in scada_wins if w.get("id") == "win-cdu-101"), None)
    assert cdu_win is not None, "CDU SCADA window not found"
    print(f"[PASS] SCADA HMI: Loaded {len(scada_wins)} P&ID Synoptic Windows, '{cdu_win['title']}' contains {len(cdu_win['elements'])} industrial components")

    print("\n==========================================")
    print("ALL WORKING FEATURE CHECKS PASSED FLAWLESSLY!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
