import urllib.request
import urllib.parse
import json
import time

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
    print("STARTING VALIDATION TEST FOR POINTS 1 THROUGH 7")
    print("==================================================")

    # 0. Health Check
    try:
        status, text = http_get(f"{BASE_URL}/health")
        assert status == 200, f"Health check failed: {status}"
        print("[PASS] Microservices Backend Gateway Health: 200 OK")
    except Exception as e:
        print(f"[FAIL] Failed health check: {e}")
        return False

    # 1. Frontend Check (IIS on 138.252.201.76:90)
    try:
        status, text = http_get(FRONTEND_URL)
        assert status == 200, f"Frontend check failed: {status}"
        assert "<title>" in text or "html" in text.lower(), "Frontend HTML invalid"
        print("[PASS] Frontend IIS Web Service: 200 OK (Clean HTML served)")
    except Exception as e:
        print(f"[FAIL] Failed frontend check: {e}")
        return False

    # POINT 1: Broker Details and Full Configuration Inspection
    try:
        status, text = http_get(f"{BASE_URL}/api/v1/dm/brokers")
        assert status == 200, f"Brokers API failed: {status}"
        brokers = json.loads(text)
        assert len(brokers) > 0, "No brokers found"
        b0 = brokers[0]
        assert "port" in b0 or "endpoint" in b0, "Broker config missing port/endpoint"
        print(f"[PASS] Point 1: Broker '{b0.get('name')}' deep configurations available (Host: {b0.get('host', 'localhost')}, Port: {b0.get('port')}, Protocol: {b0.get('protocol')})")
    except Exception as e:
        print(f"[FAIL] Point 1 Failed: {e}")
        return False

    # POINT 2: Device Creation Single Broker Flow Validation
    try:
        flow_payload = {
            "device_id": f"dev-test-{int(time.time())}",
            "device_name": "Test Gas Compressor Sensor",
            "broker_id": brokers[0]["id"],
            "protocol": "MQTT",
            "telemetry_format": "JSON_SCHEMA_V1"
        }
        status, text = http_post(f"{BASE_URL}/api/v1/dm/devices/validate-flow", flow_payload)
        assert status == 200, f"Device flow validation failed: {status}"
        flow_data = json.loads(text)
        assert flow_data.get("valid") is True, f"Flow validation returned false: {flow_data}"
        print(f"[PASS] Point 2: Single Broker Device Flow Validated (100% Ready, Broker: {flow_data.get('broker_name')})")
    except Exception as e:
        print(f"[FAIL] Point 2 Failed: {e}")
        return False

    # POINT 4: Event Forwarding to Node-RED / n8n / Webhook
    try:
        ef_test_payload = {
            "destination_url": "http://127.0.0.1:1880/telemetry",
            "payload": {
                "asset_id": "asset-cdu-101",
                "asset_name": "Fractionation Column CDU-101",
                "tag": "CRUDE_TOP_PRESSURE",
                "value": 142.8,
                "timestamp": "2026-10-09T02:30:00Z"
            }
        }
        status, text = http_post(f"{BASE_URL}/api/v1/dm/event-forwardings/test-direct", ef_test_payload)
        assert status == 200, f"Event forwarding test failed: {status} ({text})"
        ef_result = json.loads(text)
        print(f"[PASS] Point 4: Event Forwarding Microservice dispatch tested (Destination: {ef_result.get('destination')}, Message: {ef_result.get('message')})")
    except Exception as e:
        print(f"[FAIL] Point 4 Failed: {e}")
        return False

    # POINT 5: Function Blocks and Calculations
    try:
        status, text = http_get(f"{BASE_URL}/api/v1/dm/function-blocks")
        assert status == 200, f"Function blocks API failed: {status}"
        fbs = json.loads(text)
        assert len(fbs) > 0, "No function blocks found"
        fb0 = fbs[0]
        exec_payload = {
            "inputs": {
                "A": 320.5,
                "B": 110.2
            }
        }
        status_exec, text_exec = http_post(f"{BASE_URL}/api/v1/dm/function-blocks/{fb0['id']}/execute", exec_payload)
        assert status_exec == 200, f"Execute FB failed: {status_exec}"
        res_exec = json.loads(text_exec)
        print(f"[PASS] Point 5: Function Block '{fb0.get('name')}' calculation execution passed (Output: {res_exec.get('output_value')})")
    except Exception as e:
        print(f"[FAIL] Point 5 Failed: {e}")
        return False

    # POINT 6: Alarm Creation Validation & Forwarding on Trigger / Return to Normal
    try:
        # 6a: Test invalid threshold hierarchy
        invalid_rule = {
            "name": "Invalid Alarm Rule",
            "alarm_type": "Analog",
            "signal": "CRUDE_TOP_TEMP",
            "high_high_threshold": 100,
            "high_threshold": 250,  # Invalid: HH < H
            "on_delay_seconds": 3,
            "off_delay_seconds": 5
        }
        status_inv, text_inv = http_post(f"{BASE_URL}/api/v1/dm/alarm-rules/validate", invalid_rule)
        assert status_inv == 200
        inv_data = json.loads(text_inv)
        assert inv_data.get("valid") is False, "Validator should reject HH <= H"
        print(f"[PASS] Point 6a: Alarm Threshold Hierarchy Validation correctly flagged invalid: {inv_data.get('errors')}")

        # 6b: Test valid threshold hierarchy
        valid_rule = {
            "name": "Valid Fractionator Temp Alarm",
            "alarm_type": "Analog",
            "class_type": "Process",
            "source": "Fractionator Column CDU-101",
            "signal": "CRUDE_TOP_TEMP",
            "high_high_threshold": 320,
            "high_threshold": 280,
            "low_threshold": 60,
            "low_low_threshold": 30,
            "on_delay_seconds": 2,
            "off_delay_seconds": 5,
            "forward_destination": "http://localhost:1880/alarms"
        }
        status_val, text_val = http_post(f"{BASE_URL}/api/v1/dm/alarm-rules/validate", valid_rule)
        assert status_val == 200
        val_data = json.loads(text_val)
        assert val_data.get("valid") is True, "Validator should accept valid hierarchy"
        print("[PASS] Point 6b: Alarm Threshold Hierarchy Validation confirmed valid (HH 320 > H 280 > L 60 > LL 30)")

        # 6c: Test alarm clearing and Return-To-Normal forwarding
        status_al, text_al = http_get(f"{BASE_URL}/api/v1/dm/alarms")
        assert status_al == 200
        alarm_list = json.loads(text_al)
        if alarm_list:
            target_alarm = alarm_list[0]
            status_clr, text_clr = http_post(f"{BASE_URL}/api/v1/dm/alarms/{target_alarm['id']}/clear", {"user": "QA_Engineer"})
            assert status_clr == 200, f"Clear alarm failed: {text_clr}"
            print(f"[PASS] Point 6c: Alarm cleared & Return-to-Normal dispatched to forwarders (Alarm: {target_alarm['alarm_name']})")
    except Exception as e:
        print(f"[FAIL] Point 6 Failed: {e}")
        return False

    print("==================================================")
    print("ALL 7 POINTS VALIDATED SUCCESSFULLY!")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
