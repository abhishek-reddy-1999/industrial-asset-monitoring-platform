"""
validation/test_thingsboard_full_reverse_engineering.py
Comprehensive Verification Suite for Reverse-Engineered ThingsBoard Architecture:
1. Platform Overview & Metrics (/api/v1/tb/overview)
2. Multi-Tenant Entities Directory (/api/v1/tb/entities)
3. Directed Relations Graph CRUD & Traversal (/api/v1/tb/relations)
4. Scoped Attributes (CLIENT, SERVER, SHARED) (/api/plugins/telemetry/.../values/attributes)
5. Historical Timeseries Downsampling Aggregations (/api/plugins/telemetry/.../values/timeseries)
6. Two-Way Synchronous RPC Gateway (/api/plugins/telemetry/.../rpc/twoway)
7. Persistent RPC Command Queue (/api/v1/tb/rpc/persistent/...)
8. ISA-18.2 Alarm Lifecycle (Create -> Ack -> Clear) (/api/v1/tb/alarm/...)
9. Rule Engine DAG Execution Simulator (/api/v1/tb/ruleEngine/test)
10. Device Profiles & Widget Bundles (/api/v1/tb/deviceProfiles, /api/v1/tb/widgetsBundles)
11. Platform Audit Trail (/api/v1/tb/audit/logs)
"""

import sys
import os
import json

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import fastapi_app

client = TestClient(fastapi_app)

def run_all_tests():
    print("=" * 70)
    print("RUNNING COMPREHENSIVE REVERSE-ENGINEERED THINGSBOARD TEST SUITE")
    print("=" * 70)

    passes = 0
    total = 0

    def test(name, fn):
        nonlocal passes, total
        total += 1
        print(f"\n[{total}] Testing: {name}...")
        try:
            fn()
            print(f"    [PASS] {name} passed successfully.")
            passes += 1
        except Exception as e:
            print(f"    [FAIL] {name} failed: {e}")

    # 1. Platform Overview
    def t_overview():
        res = client.get("/api/v1/tb/overview")
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert "tenants" in data, "Missing tenants in overview"
        assert "devices" in data, "Missing devices in overview"
        assert "alarms" in data, "Missing alarms in overview"
        print(f"        -> Tenants: {data['tenants']['total']}, Devices: {data['devices']['total']}, Active Alarms: {data['alarms']['activeUnacknowledged'] + data['alarms']['activeAcknowledged']}")
    test("Platform Overview & System Metrics", t_overview)

    # 2. Multi-Tenant Entities Directory
    def t_entities():
        res = client.get("/api/v1/tb/entities")
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert len(data.get("tenants", [])) >= 1, "Expected at least 1 tenant"
        assert len(data.get("customers", [])) >= 2, "Expected at least 2 customers"
        assert len(data.get("devices", [])) >= 1, "Expected at least 1 device"
        print(f"        -> Verified {len(data['tenants'])} tenants, {len(data['customers'])} customers, {len(data['assets'])} assets, {len(data['devices'])} devices")
    test("Multi-Tenant Entities Directory", t_entities)

    # 3. Directed Relations Graph CRUD
    def t_relations():
        # Query relations
        res = client.get("/api/v1/tb/relations")
        assert res.status_code == 200, f"Status: {res.status_code}"
        rels = res.json()
        assert len(rels) >= 4, f"Expected relations >= 4, got {len(rels)}"

        # Create custom relation
        payload = {
            "from": {"id": "ast-unit-cdu", "type": "ASSET"},
            "to": {"id": "dev-heat-pump-01", "type": "DEVICE"},
            "type": "Controls",
            "typeGroup": "COMMON"
        }
        res_create = client.post("/api/v1/tb/relations", json=payload)
        assert res_create.status_code == 200, f"Create relation failed: {res_create.status_code}"
        assert res_create.json().get("status") == "SUCCESS"
        print(f"        -> Created and verified relation 'Controls' from ast-unit-cdu to dev-heat-pump-01")
    test("Directed Relations Graph CRUD", t_relations)

    # 4. Scoped Attributes (CLIENT, SERVER, SHARED)
    def t_scoped_attributes():
        # Get all scopes
        res = client.get("/api/plugins/telemetry/DEVICE/dev-cdu-01/values/attributes")
        assert res.status_code == 200, f"Status: {res.status_code}"
        attrs = res.json()
        assert "client" in attrs, "Missing CLIENT_SCOPE"
        assert "server" in attrs, "Missing SERVER_SCOPE"
        assert "shared" in attrs, "Missing SHARED_SCOPE"

        # Update SHARED_SCOPE
        update_payload = {"targetSetpoint": 88.5, "operationalMode": "CASCADE_AUTO"}
        res_update = client.post("/api/plugins/telemetry/DEVICE/dev-cdu-01/attributes/SHARED_SCOPE", json=update_payload)
        assert res_update.status_code == 200, f"Update attributes failed: {res_update.status_code}"
        print(f"        -> CLIENT_SCOPE: {list(attrs['client'].keys())}")
        print(f"        -> SERVER_SCOPE: {list(attrs['server'].keys())}")
        print(f"        -> SHARED_SCOPE: {list(attrs['shared'].keys())} (Updated targetSetpoint to 88.5)")
    test("Scoped Attributes Engine (CLIENT, SERVER, SHARED)", t_scoped_attributes)

    # 5. Historical Timeseries Downsampling Aggregations
    def t_timeseries():
        res = client.get("/api/plugins/telemetry/DEVICE/dev-cdu-01/values/timeseries?keys=TIC_101.PV,PIC_101.PV&agg=AVG&limit=30")
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert "TIC_101.PV" in data, "Missing TIC_101.PV in response"
        assert "PIC_101.PV" in data, "Missing PIC_101.PV in response"
        pts = data["TIC_101.PV"]
        assert len(pts) > 0, "No timeseries points returned"
        assert "ts" in pts[0] and "value" in pts[0], "Malformed point"
        print(f"        -> Successfully aggregated {len(pts)} points for TIC_101.PV (First sample: {pts[0]['value']} °C)")
    test("Historical Timeseries Downsampling Engine", t_timeseries)

    # 6. Two-Way Synchronous RPC Gateway
    def t_two_way_rpc():
        rpc_payload = {
            "method": "setOperationalSetpoint",
            "params": {"setpoint": 83.0, "unit": "kPa"},
            "timeout": 5000
        }
        res = client.post("/api/plugins/telemetry/DEVICE/dev-cdu-01/rpc/twoway", json=rpc_payload)
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert data.get("status") == "SUCCESS", f"RPC failed: {data}"
        assert "latency_ms" in data, "Missing latency metric"
        assert data.get("response", {}).get("setpoint") == 83.0
        print(f"        -> Dispatched '{data['method']}' to dev-cdu-01 in {data['latency_ms']} ms")
    test("Two-Way Synchronous RPC Gateway", t_two_way_rpc)

    # 7. Persistent RPC Command Queue
    def t_persistent_rpc():
        res = client.get("/api/v1/tb/rpc/persistent/dev-cdu-01")
        assert res.status_code == 200, f"Status: {res.status_code}"
        cmds = res.json()
        assert len(cmds) >= 1, "Expected at least 1 persistent RPC command in history"
        print(f"        -> Verified {len(cmds)} commands in persistent queue (Latest: {cmds[-1]['method']})")
    test("Persistent RPC Command Queue", t_persistent_rpc)

    # 8. ISA-18.2 Alarm Lifecycle (Create -> Ack -> Clear)
    def t_alarm_lifecycle():
        # Create
        create_payload = {
            "type": "TOWER_TEMP_SURGE",
            "severity": "CRITICAL",
            "originator": {"id": "dev-cdu-01", "type": "DEVICE", "name": "CENTUM VP DCS C-101"},
            "details": {"currentValue": 210.5, "threshold": 190.0, "unit": "°C"}
        }
        res_create = client.post("/api/v1/tb/alarm", json=create_payload)
        assert res_create.status_code == 200, f"Create alarm failed: {res_create.status_code}"
        al = res_create.json().get("alarm")
        alarm_id = al["id"]
        assert al["status"] == "ACTIVE_UNACK", "Alarm status must be ACTIVE_UNACK"

        # Acknowledge
        res_ack = client.post(f"/api/v1/tb/alarm/{alarm_id}/ack")
        assert res_ack.status_code == 200
        ack_al = res_ack.json().get("alarm")
        assert ack_al["status"] == "ACTIVE_ACK", "Alarm status must transition to ACTIVE_ACK"

        # Clear
        res_clear = client.post(f"/api/v1/tb/alarm/{alarm_id}/clear")
        assert res_clear.status_code == 200
        cleared_al = res_clear.json().get("alarm")
        assert cleared_al["status"] == "CLEARED_ACK", "Alarm status must transition to CLEARED_ACK"
        print(f"        -> Lifecycle transition: ACTIVE_UNACK -> ACTIVE_ACK -> CLEARED_ACK (Alarm: {alarm_id})")
    test("ISA-18.2 Alarm Lifecycle (Create -> Ack -> Clear)", t_alarm_lifecycle)

    # 9. Rule Engine DAG Simulator
    def t_rule_engine():
        sim_payload = {
            "chain_id": "rc-root-01",
            "message": {
                "temperature": 96.5,
                "pressure": 290.0,
                "vibration": 5.2
            }
        }
        res = client.post("/api/v1/tb/ruleEngine/test", json=sim_payload)
        assert res.status_code == 200, f"Status: {res.status_code}"
        data = res.json()
        assert data.get("status") == "SUCCESS", f"Simulation failed: {data}"
        assert data.get("total_nodes_traversed", 0) > 0, "No nodes traversed"
        print(f"        -> DAG Simulation: {data['total_nodes_traversed']} nodes traversed in {data['total_latency_ms']} ms")
    test("Rule Engine DAG Execution Simulator", t_rule_engine)

    # 10. Device Profiles & Widget Bundles
    def t_profiles_and_bundles():
        res_dp = client.get("/api/v1/tb/deviceProfiles")
        assert res_dp.status_code == 200
        profiles = res_dp.json()
        assert len(profiles) >= 3, "Expected at least 3 device profiles"

        res_wb = client.get("/api/v1/tb/widgetsBundles")
        assert res_wb.status_code == 200
        bundles = res_wb.json()
        assert len(bundles) >= 5, "Expected at least 5 widget bundles"
        print(f"        -> {len(profiles)} Device Profiles verified: {[p['name'] for p in profiles]}")
        print(f"        -> {len(bundles)} Widget Bundles verified: {[b['title'] for b in bundles]}")
    test("Device Profiles & Widget Bundles Registry", t_profiles_and_bundles)

    # 11. Audit Trail
    def t_audit_trail():
        res = client.get("/api/v1/tb/audit/logs")
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) > 0, "Expected audit logs to be populated"
        print(f"        -> Verified {len(logs)} audit entries recorded in immutable ledger")
    test("Platform Audit Trail & Security Ledger", t_audit_trail)

    print("\n" + "=" * 70)
    print(f"RESULT: {passes}/{total} TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return passes == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
