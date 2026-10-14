import httpx
import json

BASE_URL = "http://127.0.0.1:91"
requests = httpx

def test_endpoints():
    print("--- 1. Health Check ---")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print("Health OK:", r.json())

    print("\n--- 2. OPC UA Broker in Brokers List ---")
    r = requests.get(f"{BASE_URL}/api/v1/dm/brokers")
    assert r.status_code == 200, f"Brokers failed: {r.text}"
    brokers = r.json()
    opcua_brk = next((b for b in brokers if b.get("id") == "brk-opcua"), None)
    assert opcua_brk is not None, "OPC UA Broker 'brk-opcua' not found in brokers list!"
    btype = opcua_brk.get('broker_type') or opcua_brk.get('type')
    endpoint = opcua_brk.get('endpoint_url') or opcua_brk.get('host')
    print(f"Found OPC UA Broker: {opcua_brk['name']} ({btype}) on {endpoint}")

    print("\n--- 3. OPC UA Address Space Tree Browse ---")
    r = requests.get(f"{BASE_URL}/api/v1/dm/brokers/opcua/browse")
    assert r.status_code == 200, f"OPC UA browse failed: {r.text}"
    browse_data = r.json()
    assert browse_data["status"] == "SUCCESS", "Browse status not SUCCESS"
    assert browse_data["server_endpoint"] == "opc.tcp://127.0.0.1:4840"
    print("Browse Endpoint:", browse_data["server_endpoint"], "Security:", browse_data["security_policy"])
    print("Root Browse Name:", browse_data["address_space"]["browse_name"])

    print("\n--- 4. OPC UA Live Node Read ---")
    r = requests.post(f"{BASE_URL}/api/v1/dm/brokers/opcua/read", json={"node_id": "ns=2;s=Yokogawa.CENTUM_VP.FCS0101.TIC_101.PV"})
    assert r.status_code == 200, f"OPC UA read failed: {r.text}"
    read_data = r.json()
    print("Read Node:", read_data["node_id"], "Value:", read_data["value"], "Status Code:", read_data["status_code"])

    print("\n--- 5. OPC UA Downlink Setpoint Write ---")
    r = requests.post(f"{BASE_URL}/api/v1/dm/brokers/opcua/write", json={
        "node_id": "ns=2;s=Yokogawa.CENTUM_VP.FCS0101.TIC_101.SV",
        "value": 178.5,
        "operator": "OPERATOR_ADMIN"
    })
    assert r.status_code == 200, f"OPC UA write failed: {r.text}"
    write_data = r.json()
    print("Write Node:", write_data["node_id"], "New Value:", write_data["written_value"], "Status:", write_data["status"])

    print("\n--- 6. OPC UA Subscription ---")
    r = requests.post(f"{BASE_URL}/api/v1/dm/brokers/opcua/subscribe", json={
        "nodes": [
            "ns=2;s=Yokogawa.CENTUM_VP.FCS0101.TIC_101.PV",
            "ns=2;s=Yokogawa.CENTUM_VP.FCS0101.PIC_101.PV"
        ],
        "scan_frequency_ms": 500
    })
    assert r.status_code == 200, f"OPC UA subscribe failed: {r.text}"
    sub_data = r.json()
    print("Subscription ID:", sub_data["subscription_id"], "Subscribed Nodes Count:", sub_data["nodes_count"])

    print("\n--- 7. ThingsBoard PE Data Converters List ---")
    r = requests.get(f"{BASE_URL}/api/v1/dm/converters")
    assert r.status_code == 200, f"Converters failed: {r.text}"
    convs = r.json()
    print(f"Found {len(convs)} Data Converters:")
    for c in convs:
        print(f" - [{c['type']}] {c['name']} (ID: {c['id']})")

    print("\n--- 8. ThingsBoard PE Uplink Data Converter Test-Run ---")
    uplink_test = {
        "converter_type": "UPLINK",
        "script": """
function decode(payload, metadata) {
    var raw = JSON.parse(payload);
    return {
        deviceName: "CENTUM-FCS-0101",
        deviceType: "Yokogawa FCS",
        attributes: { firmware: "R6.09.00", plant_area: "CDU" },
        telemetry: {
            TIC_101_PV: raw.temperature || 175.4,
            PIC_101_PV: raw.pressure || 2.45
        }
    };
}
        """,
        "payload": '{"temperature": 182.3, "pressure": 2.51}',
        "metadata": {"topic": "v1/devices/me/telemetry", "protocol": "OPC_UA"}
    }
    r = requests.post(f"{BASE_URL}/api/v1/dm/converters/test-run", json=uplink_test)
    assert r.status_code == 200, f"Converter test-run failed: {r.text}"
    test_out = r.json()
    print("Converter Test Run Result Status:", test_out["status"])
    print("Output JSON:", json.dumps(test_out["output"], indent=2))

    print("\n--- 9. ThingsBoard Device Profiles API ---")
    r = requests.get(f"{BASE_URL}/api/v1/dm/device-profiles")
    assert r.status_code == 200, f"Device Profiles failed: {r.text}"
    profiles = r.json()
    print(f"Found {len(profiles)} Device Profiles:")
    for p in profiles:
        print(f" - {p['name']} (Type: {p['type']}, Transport: {p['transport_type']}, Alarms: {len(p.get('alarm_rules', []))})")

    print("\n--- 10. ThingsBoard Entity Relations API ---")
    r = requests.get(f"{BASE_URL}/api/v1/dm/relations")
    assert r.status_code == 200, f"Relations failed: {r.text}"
    relations = r.json()
    print(f"Found {len(relations)} Entity Relations:")
    for rel in relations:
        print(f" - {rel['from_id']} ({rel.get('from_type')}) --[{rel.get('relation_type')}]--> {rel['to_id']} ({rel.get('to_type')})")

    print("\n==========================================")
    print("ALL 10 VERIFICATION SUITES PASSED FLAWLESSLY!")
    print("==========================================")

if __name__ == "__main__":
    test_endpoints()
