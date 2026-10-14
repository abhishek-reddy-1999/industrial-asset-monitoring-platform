import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:91"
FRONTEND_URL = "http://138.252.201.76:90/"

def http_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.status, response.read().decode('utf-8')

def http_post(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

def run_tests():
    print("==================================================")
    print("TESTING THINGSBOARD FEATURES INTEGRATION")
    print("==================================================")

    # 1. Frontend Check (IIS)
    try:
        status, text = http_get(FRONTEND_URL)
        assert status == 200
        print("[PASS] Frontend IIS Service: 200 OK")
    except Exception as e:
        print(f"[FAIL] Frontend Check: {e}")
        return False

    # 2. ThingsBoard Remote RPC Execution
    try:
        rpc_payload = {
            "method": "setOperationalSetpoint",
            "params": {"setpoint": 82.5, "unit": "kPa"},
            "target_tag": "PIC_101.PV"
        }
        status, text = http_post(f"{BASE_URL}/api/v1/dm/devices/dev-cdu-01/rpc", rpc_payload)
        assert status == 200, f"RPC call failed: {status}"
        data = json.loads(text)
        assert data.get("success") is True, f"RPC response not success: {data}"
        print(f"[PASS] ThingsBoard Remote RPC Execution passed (Method: {data.get('method')}, Latency: {data.get('execution_time_ms')}ms)")
    except Exception as e:
        print(f"[FAIL] ThingsBoard RPC Test: {e}")
        return False

    # 3. ThingsBoard Rule Chains List
    try:
        status, text = http_get(f"{BASE_URL}/api/v1/dm/rule-chains")
        assert status == 200, f"Rule Chains GET failed: {status}"
        chains = json.loads(text)
        assert len(chains) >= 2, "Expected at least 2 rule chains"
        print(f"[PASS] ThingsBoard Rule Chains API passed ({len(chains)} chains available)")
    except Exception as e:
        print(f"[FAIL] Rule Chains API: {e}")
        return False

    # 4. ThingsBoard Rule Chain Test Run Simulation
    try:
        sim_payload = {
            "chain_id": "rc-root-01",
            "message": {
                "temperature": 94.6,
                "pressure": 268.4
            }
        }
        status, text = http_post(f"{BASE_URL}/api/v1/dm/rule-chains/test-run", sim_payload)
        assert status == 200, f"Rule Chain test-run failed: {status}"
        sim_data = json.loads(text)
        assert sim_data.get("status") == "SUCCESS", f"Simulation failed: {sim_data}"
        print(f"[PASS] ThingsBoard Rule Chain Simulation passed ({sim_data.get('total_nodes_traversed')} nodes traversed, Latency: {sim_data.get('total_latency_ms')}ms)")
    except Exception as e:
        print(f"[FAIL] Rule Chain Simulation: {e}")
        return False

    print("==================================================")
    print("ALL THINGSBOARD INTEGRATION TESTS PASSED!")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
